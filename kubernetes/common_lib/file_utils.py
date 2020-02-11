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

from google.cloud import storage, pubsub_v1
import datetime
import logging
import tempfile
import pytz
import csv
import re
import time
import os
from multiprocessing import Pool, cpu_count
import stat
import pickle


_filelist = {}
_filelist_timestamp = {}
def update_filelist(location_name):
    global _filelist
    global _filelist_timestamp
     
    if location_name not in _filelist:# or time.time() - _filelist_timestamp[location_name] > 60*60:
        logging.info("Update filelist for %s" % location_name)
        bucket = storage.Client().get_bucket("deepblue-temp")
        blob = bucket.get_blob(location_name + ".csv")
        if not blob:
            logging.error(location_name + ".csv not found")
            _filelist[location_name] = []
            _filelist_timestamp[location_name] = time.time()     
            return       

        tmp = tempfile.NamedTemporaryFile(suffix=".csv", delete=False)
        blob.download_to_file(tmp)
        tmp.close()

        with open(tmp.name, mode="r") as csv_file:
            csv_reader = csv.reader(csv_file, delimiter=",")

            c = []

            for row in csv_reader:
                c.append(
                    {
                        "filename": row[0],
                        "start_time": datetime.datetime.utcfromtimestamp(
                            float(row[1])
                        ).replace(tzinfo=pytz.UTC),
                        "end_time": datetime.datetime.utcfromtimestamp(
                            float(row[2])
                        ).replace(tzinfo=pytz.UTC),
                        "original_filename": row[3],
                    }
                )
            
            _filelist[location_name] = c
            _filelist_timestamp[location_name] = time.time() 
        os.unlink(tmp.name)
    else:
        logging.info("Cache age %f" % (time.time() - _filelist_timestamp[location_name]))

def get_filelist(location_name):
    global _filelist
    if location_name not in _filelist:
        logging.warning("Updating filelist from sub process")
        update_filelist(location_name)
    return _filelist[location_name]
    
def query_audio_files(location_name, original_filename):
    filelist = get_filelist(location_name)
    return list(filter(lambda x: x["original_filename"] == original_filename, filelist))

def query_audio_files_in_range(location_name, start_time, end_time):
    """ Fetch audio files in given timeslot """
    filelist = get_filelist(location_name)

    return list(
        filter(
            lambda x: x["end_time"] >= start_time and x["start_time"] < end_time,
            filelist,
        )
    )


def get_location_name(experiment_name):
    search = re.search(r"^(\D+)(\d+)", experiment_name)
    if search:
        return search.group(1)
    else:
        return experiment_name


def _fetch(filename):
    # logging.info("Downloading %s" % filename)
    tmp = tempfile.NamedTemporaryFile(delete=False)
    blob = _bucket.blob(filename)
    blob.download_to_file(tmp)
    tmp.seek(0)

    if _fn:
        return _fn(tmp, blob)
    else:
        return tmp


def fetch_files(filenames, bucket_name, fn):
    def init_pool():
        global _bucket
        global _fn
        _bucket = storage.Client().get_bucket(bucket_name)
        _fn = fn

    with Pool(initializer=init_pool, processes=cpu_count() * 4) as pool:
        ret = pool.map(_fetch, filenames)
    return ret
