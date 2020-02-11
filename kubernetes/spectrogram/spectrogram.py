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

import tempfile
from google.cloud import storage
import numpy as np
import librosa
import png
import time
import math
import logging
import sys
import os
from multiprocessing import Pool, cpu_count
import argparse

from PIL import Image, ImageFile

ImageFile.LOAD_TRUNCATED_IMAGES = True

from common_lib import file_utils, cloud_logging, worker

cloud_logging.setup_logging()

PUBSUB_SUBSCRIPTION = "generate_spectrogram"
OUTPUT_BUCKET = "deepblue-spectrograms"
OUTPUT_BUCKET_DENOISE = "deepblue-spectrograms-denoise"
FILE_PREFIX = ''
FILE_PREFIX_DENOISE = ''

FREQ_MIN = 50
FREQ_MAX = 4000
HOP_LENGTH = 256
WINDOW = "blackmanharris"
DB_MIN = -80
DB_MAX = 10
FILTER_SCALE = 0.5

N_BINS = 1024


def fetch_filelist(message):
    file_utils.update_filelist(message.attributes.get('experiment_name'))

def scale(D, inMin, inMax):
    outMax = 255.0
    D = ((D - inMin) / (inMax - inMin)) * outMax
    D = np.clip(D, 0, 255)
    return D

def generate_cqt(file, blob):
    logging.info("Process %s" % blob.name)
    audio, sr = librosa.load(file.name)

    n_bins = N_BINS
    octave_range = librosa.core.hz_to_octs(FREQ_MAX) - librosa.core.hz_to_octs(FREQ_MIN)
    bins_per_octave = int(n_bins / octave_range)

    cqt = librosa.cqt(
        audio,
        sr=sr,
        hop_length=HOP_LENGTH,
        fmin=FREQ_MIN,
        n_bins=n_bins,
        bins_per_octave=bins_per_octave,
        filter_scale=FILTER_SCALE,
        window=WINDOW,
    )

    cqt = np.abs(cqt.T).astype(dtype=np.float16, copy=False)

    file.close()
    os.unlink(file.name)
    return cqt


def upload_file(file, bucket_name, source_name):
    storage_client = storage.Client()
    bucket = storage_client.get_bucket(bucket_name)
    # write the npy
    output_name = "{}.png".format(source_name)
    blob = bucket.blob(output_name)

    blob.upload_from_filename(file.name)

    logging.info("Stored gs://%s/%s" % (bucket_name, output_name))

    # Set metadata on file for debuggin
    metadata = {}
    metadata["source_name"] = source_name
    metadata["freq_min"] = FREQ_MIN
    metadata["freq_max"] = FREQ_MAX
    metadata["window"] = WINDOW
    metadata["hop_length"] = HOP_LENGTH
    metadata["db_min"] = DB_MIN
    metadata["db_max"] = DB_MAX
    metadata["filter_scale"] = FILTER_SCALE
    blob.metadata = metadata
    blob.patch()


# def clean_cqt(input_cqt, median_cqt, mode="mean"):
#     """ Assumes first axis is time. `mode` is 'median' or 'std'. """
#     clean = input_cqt / median_cqt  # EQ to global median
#     # clean /= np.median(clean, axis=0)  # EQ to local median
#     if mode == "median":
#         clean *= np.median(input_cqt)
#     elif mode == "std":
#         clean -= clean.mean()
#         clean /= clean.std()
#         clean *= input_cqt.std()
#         clean += input_cqt.mean()
#     elif mode == 'mean':
#         clean *= input_cqt.mean() / clean.mean()
#     return clean

def clean_cqt(input_cqt, median_cqt):
    clean = input_cqt / median_cqt
    clean *= np.median(median_cqt)
    return clean

def save_cqt(cqt):
    height, width = cqt.shape
    tmp = tempfile.NamedTemporaryFile(mode="wb", suffix=".png")
    png_writer = png.Writer(width, height, greyscale=True)
    png_writer.write(tmp, scale(cqt.copy(), DB_MIN, DB_MAX).astype(dtype=np.uint8))
    return tmp

def query_audio_files(experiment_name, name):
    # Get the filenames for a certain location name
    q = file_utils.query_audio_files(
        file_utils.get_location_name(experiment_name), name
    )
    
    # Change to use wav files rather than mp3 files
    # filenames = [x["filename"] for x in q]
    filenames = [x["filename"].replace('.mp3', '.wav') for x in q]
    logging.info("Found %i files" % len(filenames))
    return filenames

def generate_spectrograms(bucket, filenames, denoise=True, upload=True, normal=True):
    logging.info("Generate spectrogram for bucket: %s" 
                    % (bucket))
    
    # Fetch the files to memory, and generate cqts (running in parallel)
    all_cqts = np.array(
        file_utils.fetch_files(filenames, bucket, generate_cqt)
    )
    
    logging.info("Download and preprocess finished")
    logging.info("Size of cqts %i bytes" % sys.getsizeof(all_cqts))
    
    median_cqt = None
    if denoise:
        # Calculate median image
        median_cqt = np.median(all_cqts, axis=0)

        logging.info("Median calculation finished")
        
    # Create list of jobs that needs to be run
    jobs = []
    for i, cqt in enumerate(all_cqts):
        jobs.append([
            filenames[i], cqt, median_cqt, normal, denoise, upload
        ])
    
    # Create initializer for parallel job, processing data
    def initializer():
        global _client
        _client = storage.Client()
    
    # Run all export function on all jobs in parallel
    with Pool(initializer=initializer, processes=cpu_count() * 4) as pool:
        pool.map(export, jobs)

def export(job):
    # Extract job info
    filename, cqt, median_cqt, normal, denoise, upload = job
    
    # Save noisy image
    if normal:
        noisy = np.flipud(cqt.T)
        noisy_cqt_db = librosa.amplitude_to_db(noisy)
        f = save_cqt(noisy_cqt_db)
        if upload:
            upload_file(f, OUTPUT_BUCKET, FILE_PREFIX+filename)

    if denoise:    
        # Generate clean image
        clean = clean_cqt(cqt, median_cqt)
        clean = np.flipud(clean.T)
        cqt_db = librosa.amplitude_to_db(clean)
        f = save_cqt(cqt_db)
        if upload:
            upload_file(f, OUTPUT_BUCKET_DENOISE, FILE_PREFIX_DENOISE+filename)

def str_to_bool(s):
    if s == 'True':
         return True
    elif s == 'False':
         return False

def pubsub_callback(message):
    # Check if pubsub message is right type
    if message.attributes.get("eventType", "OBJECT_FINALIZE") == "OBJECT_FINALIZE":
        bucket_id = message.attributes.get("bucketId")
        filename = message.attributes.get("filename")
        experiment_name = message.attributes.get("experiment_name")
        
        try:
            filenames = query_audio_files(experiment_name, filename)
            generate_spectrograms(
                bucket=bucket_id,
                filenames=filenames, 
                upload=True,
                denoise=str_to_bool(message.attributes.get("denoise", True)), 
                normal=str_to_bool(message.attributes.get("normal", True)),                 
                )

        except Exception as e:
            logging.exception(
                "Exception of type %s during processing" % e,
                extra={
                    "bucketId": bucket_id,
                    "_filename": filename,
                    "experiment_name": experiment_name,
                    "exception": e,
                },
            )

        logging.info(
            "Finished job %s" % filename,
            extra={
                "bucketId": bucket_id,
                "_filename": filename,
                "experiment_name": experiment_name,
            },
        )

if __name__ == "__main__":
    parser = argparse.ArgumentParser("Spectrogram Generator")

    parser.add_argument('--pubsub', action='store_true', help="Fetch tasks from pubsub")
    
    parser.add_argument('--file', help="filename to process")
    parser.add_argument('--bucket', help="bucket to process", default='deepblue-transcoded-audio')
    parser.add_argument('--denoise', action='store_true', help="denoise spectrogram")
    parser.add_argument('--upload', action='store_true', help="Upload images to cloud storage")
    parser.add_argument('--max-count', type=int, help="Max number chunks to process")
    parser.add_argument('--destination-bucket', default='cl-deepblue-test', help="Bucket to output files if uploading")
    
    parser.add_argument('--freq-min', default=FREQ_MIN, type=int)
    parser.add_argument('--freq-max', default=FREQ_MAX, type=int)
    parser.add_argument('--hop-length', default=HOP_LENGTH, type=int)
    parser.add_argument('--db-min', default=DB_MIN, type=int)
    parser.add_argument('--db-max', default=DB_MAX, type=int)
    parser.add_argument('--window', default=WINDOW)
    parser.add_argument('--n-bins', default=N_BINS, type=int)
    parser.add_argument('--filter-scale', default=FILTER_SCALE, type=float)

    args = parser.parse_args()

    if args.pubsub or len(sys.argv) == 1:
        worker.pull_pubsub(PUBSUB_SUBSCRIPTION, pubsub_callback, fetch_filelist)
    else:
        print(args)

        filenames = query_audio_files('Hawaii', args.file)
        if args.max_count:
            filenames = filenames[:args.max_count]

        OUTPUT_BUCKET = args.destination_bucket
        OUTPUT_BUCKET_DENOISE = args.destination_bucket

        FILE_PREFIX = 'normal/'
        FILE_PREFIX_DENOISE = 'denoise/'

        FREQ_MIN = args.freq_min
        FREQ_MAX = args.freq_max
        HOP_LENGTH = args.hop_length
        DB_MIN = args.db_min
        DB_MAX = args.db_max
        WINDOW = args.window
        N_BINS = args.n_bins
        FILTER_SCALE = args.filter_scale


        generate_spectrograms(
            bucket=args.bucket,
            filenames=filenames,
            denoise=args.denoise,
            upload=args.upload
        )