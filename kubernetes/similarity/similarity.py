#!/usr/bin/python
#
# Copyright 2019 Google Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

from common_lib import file_utils, cloud_logging, worker
from google.cloud import storage, pubsub_v1
import sys
import os
import logging
import tempfile
import datetime
import math
import multiprocessing
from PIL import Image, ImageFile
import numpy as np
from dateutil import tz
import librosa
import cv2
ImageFile.LOAD_TRUNCATED_IMAGES = True

CLOUD_PROJECT = 'gweb-deepblue'
PUBSUB_SUBSCRIPTION = 'generate_similarity'
ACK_DEADLINE = 30

cloud_logging.setup_logging()

OUTPUT_BUCKET_NAME = 'deepblue-similarities'


def fetch_spectrogram_image(row):
    """ Fetch spectrogram at specific path from cloud storage """
    
    try: 
        filename = row['filename'].replace('.mp3','.wav')+".png"
        # filename = row['filename']
        logging.info("Fetching "+filename)
        blob = pool_bucket.get_blob(filename)        
        if not blob:
            logging.error(filename+" not found")
        
        tmp = tempfile.NamedTemporaryFile(suffix=".png")
        blob.download_to_file(tmp)
        tmp.seek(0)
        img = np.asarray(Image.open(tmp))

        assert blob.metadata['db_min']
        assert blob.metadata['db_max']

        img_mapped = np.interp(img, (0, 255), (int(blob.metadata['db_min']), int(blob.metadata['db_max'])))

        cqt = librosa.db_to_amplitude(img_mapped)
        cqt = np.flipud(cqt).T

        tmp.close()
        
        return [cqt, blob.metadata]
    except Exception as e:
        logging.error("Could not download "+filename)
        logging.error(e)
        return 

def get_chunks(x, width, stride):
    indices = np.arange(0, len(x) - width, stride)
    chunks = np.empty((len(indices), width, x.shape[1]), dtype=x.dtype)
    for i in range(len(indices)):
        j = indices[i]
        chunks[i] = x[j:j+width]
    return chunks

def straighten(cov):
    n = len(cov)
    straight = np.zeros_like(cov)
    for i, row in enumerate(cov):
        src = max(0, i - n//2)
        dst = max(0, n//2 - i)
        sw = len(cov[i, src:])
        dw = len(straight[i, dst:])
        w = min(sw, dw)
        straight[i, dst:dst+w] = cov[i,src:src+w]
    return straight

def flatish(x):
    return x.reshape(len(x), -1)

def histogram_equalize(data, max_val=None, endpoint=False):
    input_shape = np.shape(data)
    data_flat = np.asarray(data).flatten()
    if max_val is None:
        max_val = data_flat.max()
    indices = np.argsort(data_flat)
    replacements = np.linspace(0, max_val, len(indices), endpoint=endpoint)
    data_flat[indices] = replacements
    return data_flat.reshape(*input_shape)

def get_similarity(amp, freq_blur=32, contrast=100, chunk_width=64, chunk_stride=8):
    if freq_blur > 0:
        blurred = cv2.GaussianBlur(amp, (2*freq_blur+1,1), 0)
        chunks = get_chunks(blurred, chunk_width, chunk_stride)
    else:
        chunks = get_chunks(amp, chunk_width, chunk_stride)
    cov = np.cov(flatish(chunks))
    normalize(cov)
    cov = histogram_equalize(cov)
    cov **= contrast
    return cov

def get_similarity_images(cqts, chunk_width=64, chunk_stride=8):
    images = []
    for i in range(len(cqts)-1):
        pair = np.vstack(cqts[i:i+2])
        pair = np.pad(pair, ((chunk_width//2, chunk_width//2), (0,0)), 'edge')
        cov = get_similarity(pair, chunk_width=chunk_width, chunk_stride=chunk_stride)
        cov = straighten(cov)
        images.append(cov)
    n = len(images[0])//2
    for i in range(len(images)):
        if i+1 < len(images):
            images[i+1][:n,:n] = images[i][n:,:n] # replace next top left with current bottom left
        else:
            images.append(images[i][n:])
        images[i] = images[i][:n]
    return images

import matplotlib.pyplot as plt
def apply_cmap(x, cmap=None):
    return plt.get_cmap('viridis' if cmap is None else cmap)(x)[...,:3]

def normalize(x):
    x -= x.min()
    x /= x.max()
    return x

def cqtshow(cqt, power=0.5):
    img = np.flipud(cqt.T).copy()
    normalize(img)
    img **= power
    return 255 * apply_cmap(img, 'inferno')

def generate_similarity(location_name, time_start, time_end, destination, bucket_name='deepblue-spectrograms-denoise', window_size=60, downsample=1):
    """ Generate a similarity image for a given timeslot and location name """
    time_start_padded = time_start - datetime.timedelta(seconds=window_size)
    time_end_padded = time_end + datetime.timedelta(seconds=window_size)

    # Get list of files needed 
    rows = file_utils.query_audio_files_in_range(
        location_name, 
        time_start_padded, 
        time_end_padded)

    # rows = [{'filename': 'Hawaii19K_DL10_150112_170357.df20.x.0218.mp3', 'start_time': datetime.datetime(2015, 1, 12, 19, 42, 55, tzinfo=tz.tzutc()), 'end_time': datetime.datetime(2015, 1, 12, 19, 43, 38, 750000, tzinfo=tz.tzutc()), 'original_filename': 'Hawaii19K_DL10_150112_170357.df20.x.wav'}, {'filename': 'Hawaii19K_DL10_150112_170357.df20.x.0219.mp3', 'start_time': datetime.datetime(2015, 1, 12, 19, 43, 38, 750000, tzinfo=tz.tzutc()), 'end_time': datetime.datetime(2015, 1, 12, 19, 44, 22, 500000, tzinfo=tz.tzutc()), 'original_filename': 'Hawaii19K_DL10_150112_170357.df20.x.wav'}, {'filename': 'Hawaii19K_DL10_150112_170357.df20.x.0220.mp3', 'start_time': datetime.datetime(2015, 1, 12, 19, 44, 22, 500000, tzinfo=tz.tzutc()), 'end_time': datetime.datetime(2015, 1, 12, 19, 45, 6, 250000, tzinfo=tz.tzutc()), 'original_filename': 'Hawaii19K_DL10_150112_170357.df20.x.wav'}, {'filename': 'Hawaii19K_DL10_150112_170357.df20.x.0221.mp3', 'start_time': datetime.datetime(2015, 1, 12, 19, 45, 6, 250000, tzinfo=tz.tzutc()), 'end_time': datetime.datetime(2015, 1, 12, 19, 45, 50, tzinfo=tz.tzutc()), 'original_filename': 'Hawaii19K_DL10_150112_170357.df20.x.wav'}, {'filename': 'Hawaii19K_DL10_150112_170357.df20.x.0222.mp3', 'start_time': datetime.datetime(2015, 1, 12, 19, 45, 50, tzinfo=tz.tzutc()), 'end_time': datetime.datetime(2015, 1, 12, 19, 46, 33, 750000, tzinfo=tz.tzutc()), 'original_filename': 'Hawaii19K_DL10_150112_170357.df20.x.wav'}, {'filename': 'Hawaii19K_DL10_150112_170357.df20.x.0223.mp3', 'start_time': datetime.datetime(2015, 1, 12, 19, 46, 33, 750000, tzinfo=tz.tzutc()), 'end_time': datetime.datetime(2015, 1, 12, 19, 47, 17, 500000, tzinfo=tz.tzutc()), 'original_filename': 'Hawaii19K_DL10_150112_170357.df20.x.wav'}]
    # logging.info(rows)

    if len(rows) == 0:
        logging.warning("No images in time range")
        return [None, None]

    # Download spectrograms
    logging.info("Downloading %i spectrogram images" % len(rows))
    def pool_initializer():
        global pool_bucket
        pool_bucket = storage.Client().get_bucket(bucket_name)
    with multiprocessing.Pool(initializer=pool_initializer) as pool:
        images = pool.map(fetch_spectrogram_image, rows)

    # Validate downloaded images
    images = [i for i in images if i is not None]
    if not images or len(images) == 0:
        logging.warning("No images in time range after download")
        return [None, None]
    logging.info("Download finished (%i)" % len(images))
    
    cqts = [i[0] for i in images]
    
    # Allocate pasteboard image
    chunk_width = cqts[0].shape[0]
    file_duration = rows[0]['end_time'] - rows[0]['start_time']
    px_per_sec = chunk_width / file_duration.total_seconds()

    window_size_px = math.floor(px_per_sec * window_size)
    target_width = math.floor((time_end_padded - time_start_padded).total_seconds() * px_per_sec)
    target_width = int(math.ceil(target_width / window_size_px) * window_size_px)
    logging.info("Target width %f" %( target_width))
    logging.info("window size %f sec (%i px)" %( window_size, window_size_px))

    pasteboard = np.zeros((target_width, cqts[0].shape[1]))

    # Insert cqts in pasteboard that is arranged correctly on a timescale
    for (i, im) in enumerate(cqts):
        start_offset_sec = (rows[i]['start_time'] - time_start_padded).total_seconds()
        end_offset_sec = (time_end_padded - rows[i]['end_time']).total_seconds()
        d = (rows[i]['end_time'] - rows[i]['start_time']).total_seconds()

        start = 0
        end = im.shape[0]

        out_start = math.floor(start_offset_sec * px_per_sec)
        out_end = im.shape[0] + out_start
            
        # If start time is before window we are analyzing, crop the file
        if start_offset_sec < 0:
            size = math.floor(im.shape[0] * (-start_offset_sec / d))  
            start = size
            out_start = 0
            out_end = (im.shape[0]-size) + out_start
        
        if end_offset_sec < 0:
            size = math.floor(im.shape[0] * (-end_offset_sec / d))  
            end = end - size
            out_end = (im.shape[0]-size) + out_start
            
        
        # logging.info("Start %i %f end %f " %(i, start_offset_sec, end_offset_sec))
        # logging.info("%i %i -> %i %i " %(start, end, out_start, out_end))

        pasteboard[out_start:out_end, :] = im[start:end, :]


    # Split pasteboard into sections of window size
    pasteboard = pasteboard.reshape(-1, window_size_px, pasteboard.shape[-1])
    
    # Generate similarity images 
    stride = 8
    similarities = get_similarity_images(pasteboard, chunk_stride=stride)

    # Stack similarity images into one large image
    stacked_similarity = np.vstack(similarities)
    
    # Calculate the cropping of image
    duration = time_end - time_start
    start = int(window_size_px / stride)
    end = int(start + math.floor(duration.total_seconds() * px_per_sec) / stride)
    
    # Crop and downsample
    stacked_similarity = stacked_similarity[ start : end : downsample, : : downsample ] 

    # logging.info(stacked_similarity.shape)

    # # DEBUG    
    # imarr = np.vstack(pasteboard)
    # imarr = cqtshow(imarr)
    # im = Image.fromarray((imarr).astype(dtype=np.uint8))
    # im = im.resize((math.floor(imarr.shape[1]/2), math.floor(imarr.shape[0]) ))
    # im.save(os.path.dirname(os.path.abspath(__file__))+"/test_spec.jpeg")

    imarr = stacked_similarity
    normalize(imarr)
    imarr = imarr.T
    # # imarr = apply_cmap(imarr, 'inferno')
    im = Image.fromarray((imarr*255).astype(dtype=np.uint8))
    # im.save(os.path.dirname(os.path.abspath(__file__))+"/test2.jpeg")
    
    
    metadata = {}
    metadata['time_start'] = time_start.isoformat(' ', 'seconds')
    metadata['time_end'] = time_end.isoformat(' ', 'seconds')
    metadata['duration'] = duration.total_seconds()
    metadata['downsample'] = downsample
    metadata['window_size'] = window_size

    store_image(im, metadata, destination=destination)


def store_image(im, metadata, destination, upload=True):
    """ Upload image to cloud storage """
    tmp = tempfile.NamedTemporaryFile(suffix=".jpg")
    im.save(tmp, format='jpeg', optimize=True, quality=80)
    tmp.seek(0)
    
    if upload:
        output_bucket = storage.Client().get_bucket(OUTPUT_BUCKET_NAME)
        blob = output_bucket.blob("{}".format(destination))
        blob.upload_from_filename(tmp.name)
        blob.metadata = metadata
        blob.patch()
        logging.info("Saved to %s" % destination)
    tmp.close()


def pubsub_callback(message):
    logging.info('processing message: {}'.format(message))
    try:
        time_fmt = "%Y-%m-%d %H:%M:%S.%f %z"
    
        generate_similarity(
            location_name=message.attributes.get('location_name'),
            time_start=datetime.datetime.strptime(message.attributes.get('time_start'), time_fmt),
            time_end= datetime.datetime.strptime(message.attributes.get('time_end'), time_fmt),
            bucket_name=message.attributes.get('bucket_name', 'deepblue-spectrograms'),
            destination=message.attributes.get('destination'),
            window_size=int(message.attributes.get('window_size')),
            downsample=int(message.attributes.get('downsample'))
        )
        
    except Exception as e:
        logging.exception("Exception of type %s during processing" % e)
        raise e

def fetch_filelist(message):
    file_utils.update_filelist(message.attributes.get('location_name'))

if __name__ == "__main__":
    if len(sys.argv) > 1:        
        generate_similarity(
            location_name=sys.argv[1],
            time_start=datetime.datetime.strptime(sys.argv[3], "%Y-%m-%d %H:%M:%S.%f %z"),
            time_end=datetime.datetime.strptime(sys.argv[4], "%Y-%m-%d %H:%M:%S.%f %z"),
            bucket_name=sys.argv[5],
            window_size=int(sys.argv[6]),
            destination="test.jpg",
            downsample=2
        )
    else:
        worker.pull_pubsub(PUBSUB_SUBSCRIPTION, pubsub_callback, fetch_filelist)
 


