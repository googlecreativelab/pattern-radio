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

from google.cloud import spanner
from google.cloud import storage
from google.cloud import pubsub_v1
import datetime

CLOUD_PROJET = 'gweb-deepblue'

SPANNER_DB_INSTANCE_ID = 'deepblue'
SPANNER_DB_DATABASE_ID = 'deepblue'

RAW_AUDIO_BUCKET_NAME = 'pifsc-dropbox'
RAW_AUDIO_BUCKET_SUBFOLDER = 'ShippedHDD/'

TRANSCODE_DESTINATION_BUCKET = 'deepblue-transcoded-audio'
TILE_DESTINATION_BUCKET = 'deepblue-tiled-spectrograms'
SPECTROGRAM_DESTINATION_BUCKET = 'deepblue-spectrograms'
DENOISE_SPECTROGRAM_DESTINATION_BUCKET = 'deepblue-spectrograms-denoise'
TEMP_BUCKET = 'deepblue-temp'

SPECTROGRAM_TILE_MIN_ZOOM = -6
SPECTROGRAM_TILE_MAX_ZOOM = 8

SIMILARITY_ZOOM_LEVEL = 4
SIMILARITY_WINDOW_SIZE = 60
SIMILARITY_DOWNSAMPLE = 2


def storage_client():
    return storage.Client()

def pubsub_client(max_messages=1):
    # batch_settings = pubsub_v1.types.BatchSettings(
    #     max_bytes=1024,  # One kilobyte
    #     max_latency=1,  # One second
    # )
    # return pubsub_v1.PublisherClient(batch_settings)
    return pubsub_v1.PublisherClient(batch_settings=pubsub_v1.types.BatchSettings(max_messages=max_messages),)

def spanner_database():
    spanner_client = spanner.Client()
    instance = spanner_client.instance(SPANNER_DB_INSTANCE_ID)
    return instance.database(SPANNER_DB_DATABASE_ID)

def unix_time_seconds(dt):
    epoch = datetime.datetime.utcfromtimestamp(0)
    dt =dt.replace(tzinfo=None)
    return (dt - epoch).total_seconds()
