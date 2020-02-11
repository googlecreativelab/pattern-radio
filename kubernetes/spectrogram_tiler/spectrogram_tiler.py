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
import multiprocessing
from multiprocessing.pool import ThreadPool
import csv
import sys
import tempfile
import math
import datetime
import logging
import time
import threading
import os
import pytz
import argparse
from PIL import Image, ImageFile
ImageFile.LOAD_TRUNCATED_IMAGES = True

CLOUD_PROJECT = 'gweb-deepblue'

DB_INSTANCE_ID = 'deepblue'
DB_DATABASE_ID = 'deepblue'
PUBSUB_SUBSCRIPTION = 'tile_spectrograms_read'
ACK_DEADLINE = 30

cloud_logging.setup_logging()

OUTPUT_BUCKET_NAME = 'deepblue-tiled-spectrograms'


def pubsub_callback(attributes):
    logging.info('processing attributes: {}'.format(attributes))
    try:
        time_fmt = "%Y-%m-%d %H:%M:%S.%f %z"
        
        im, metadata = generate_combined_spectrogram(
            location_name = attributes.get('experiment_name'),
            width = int(attributes.get('width')),
            time_start = datetime.datetime.strptime(attributes.get('time_start'), time_fmt),
            time_end = datetime.datetime.strptime(attributes.get('time_end'), time_fmt),
            bucket_name = attributes.get('bucket_name', 'deepblue-spectrograms'),
        )
        if im and metadata:
            store_image(im, metadata, attributes.get('destination'))            
        else:
            logging.info("Skipped job")
        
    except Exception as e:
        logging.exception("Exception of type %s during processing" % e)
        raise e

def fetch_filelist(attributes):
    experiment_name = "Hawaii"
    if attributes:
        experiment_name = attributes.get('experiment_name')
    file_utils.update_filelist(experiment_name)

def resize_image(row, image):
    """ Resize image to target resolution """
    target_resolution = row['target_resolution']
    dur = (row['end_time'] - row['start_time']).total_seconds()
    return image.resize(
        (
            math.ceil(dur / target_resolution),
            image.size[1]
        ), Image.LANCZOS)


def fetch_scaled_spectrogram_image(row):
    """ Fetch spectrogram at specific path from cloud storage """
    
    try: 
        filename = row['filename'].replace('.mp3','.wav')
        logging.info("Fetch "+filename+".png")
        blob = pool_bucket.get_blob(filename+".png")
        if not blob:
            logging.error(filename+".png not found")
        
        tmp = tempfile.NamedTemporaryFile(suffix=".png")
        blob.download_to_file(tmp)
        tmp.seek(0)
        img = Image.open(tmp)
        
        logging.info("Resize "+filename)
        scaled_img = resize_image(row, img)

        tmp.close()
        logging.info("Finished loading "+filename)
        return [scaled_img, blob.metadata]
    except Exception as e:
        logging.error("Could not download "+filename+".png")
        logging.error(e)
        return 


def generate_combined_spectrogram(location_name, width, time_start, time_end, bucket_name='deepblue-spectrograms'):
    """ Generate a spectrogram of specific width for a given timeslot and location_name """

    duration = time_end - time_start
    target_resolution = duration.total_seconds() / width  # sec / px
    # rows = query_audio_files_in_range(location_name, time_start, time_end)
    rows = file_utils.query_audio_files_in_range(location_name, time_start, time_end)
    if len(rows) == 0:
        logging.warning("No images in time range")
        return [None, None]

    for row in rows:
        row['target_resolution'] = target_resolution

    logging.info("Downloading %i images" % len(rows))

    def pool_initializer():
        global pool_bucket
        pool_bucket = storage.Client().get_bucket(bucket_name)


    with multiprocessing.Pool(initializer=pool_initializer) as pool:
        images = pool.map(fetch_scaled_spectrogram_image, rows)

    images = [i for i in images if i is not None]
    if not images or len(images) == 0:
        logging.warning("No images in time range after download")
        return [None, None]


    logging.info("Download finished")

    # Verify height of spectrograms
    _, heights = zip(*(i[0].size for i in images))
    max_height = max(heights)
    min_height = min(heights)
    if max_height != min_height:
        logging.error("Min height %i and max height %i not the same " %
                      (min_height, max_height))

    # Create new output image
    width = math.ceil(duration.total_seconds() / target_resolution)
    new_im = Image.new('L', (width, max_height))

    # Paste spectrograms into output image
    for (i, im) in enumerate(images):
        t = rows[i]['start_time'] - time_start
        new_im.paste(
            im[0], (math.floor(t.total_seconds() / target_resolution), 0))

    for im in images:
        im[0].close()

    metadata = images[0][1]
    if not metadata:
        metadata = {}

    metadata['duration'] = duration.total_seconds()
    metadata['target_resolution'] = target_resolution
    metadata['source_name'] = None

    return [new_im, metadata]


def store_image(im, metadata, destination="", upload=True):
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



if __name__ == "__main__":
    parser = argparse.ArgumentParser("Spectrogram Tiler")
    parser.add_argument('--start-time', help="Start date",  nargs='+',)
    parser.add_argument('--end-time', help="End date",  nargs='+',)
    parser.add_argument('--width', type=int, default=512)
    parser.add_argument('--bucket-name', default='deepblue-spectrograms')
    parser.add_argument('--destination', default='test.jpg')
    parser.add_argument('--location_name', default='Hawaii')

    if len(sys.argv) == 1:
        worker.pull_pubsub_streaming(PUBSUB_SUBSCRIPTION, pubsub_callback, fetch_filelist)
    else :
        args = parser.parse_args()

        im, metadata = generate_combined_spectrogram(
            location_name=args.location_name,
            width=args.width,
            time_start=datetime.datetime.strptime(' '.join(args.start_time), "%Y-%m-%d %H:%M:%S.%f %z"),
            time_end=datetime.datetime.strptime(' '.join(args.end_time), "%Y-%m-%d %H:%M:%S.%f %z"),
            bucket_name=args.bucket_name
            
        )
        store_image(im, metadata, upload=True, destination=args.destination)
        
