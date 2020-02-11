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

# -*- coding: utf-8 -*-
from google.cloud.exceptions import NotFound
from google.cloud import spanner
from google.cloud import pubsub_v1
from google.cloud import storage
from google.api_core.exceptions import Aborted, GoogleAPICallError

from common_lib import cloud_logging, worker

import time
import sys
import struct
from datetime import datetime
import os
import logging
import threading
import multiprocessing
from multiprocessing import Pool, cpu_count
import tempfile

from pydub import AudioSegment

from transcode.src.read_xwav_header import read_header
from transcode.src import process_audio

cloud_logging.setup_logging()
Log = logging.getLogger(__name__)


CLOUD_PROJECT = 'gweb-deepblue'

PUBSUB_SUBSCRIPTION = 'transcode_file'
PUBSUB_PUBLISH_TOPIC = 'projects/%s/topics/raw_audio_transcoded' % CLOUD_PROJECT

DB_INSTANCE_ID = 'deepblue'
DB_DATABASE_ID = 'deepblue'
AUDIO_FILES_SPANNER_TABLE = 'audio_files'
SUBCHUNKS_SPANNER_TABLE = 'audio_subchunks'

MAX_SOUND_DURATION_SEC_DEFAULT = 75
ACK_DEADLINE = 30

publish_client = pubsub_v1.PublisherClient()
spanner_client = spanner.Client()
instance = spanner_client.instance(DB_INSTANCE_ID)
database = instance.database(DB_DATABASE_ID)
storage_client = storage.Client()


def pubsub_callback(message):
    # Check if pubsub message is right type
    if message.attributes.get('eventType', 'OBJECT_FINALIZE') == 'OBJECT_FINALIZE':

        # Retrieve attributes
        bucket_id = message.attributes.get('bucketId')
        object_id = message.attributes.get('objectId')
        max_chunk_duration = int(message.attributes.get(
            'maxChunkDuration', MAX_SOUND_DURATION_SEC_DEFAULT))
        output_bucket = message.attributes.get('outputBucket')

        Log.info('Received job %s' % message.attributes.get('objectId'), extra={
            "bucketId": bucket_id,
            "objectId": object_id,
            "outputBucket": output_bucket,
        })
        try:
            # Download file to local disk
            file_path = _download(bucket_id, object_id)

            # Process file
            experiment_name = process(file_path,
                                      object_id,
                                      max_chunk_duration,
                                      output_bucket)
                                      
            os.unlink(file_path)
            # Publish that file has been processed
            # publish_client.publish(PUBSUB_PUBLISH_TOPIC, b'',
            #                        filename=os.path.basename(object_id),
            #                        bucketId=output_bucket,
            #                        experiment_name=experiment_name)

        except Aborted as e:
            Log.exception("Aborted exception of type %s during processing. Not acking" % e, extra={
                "bucketId": bucket_id,
                "objectId": object_id,
                "exception": e
            })
            raise e
        except GoogleAPICallError as e:
            Log.exception("GoogleAPICallError exception of type %s during processing. Not acking" % e, extra={
                "bucketId": bucket_id,
                "objectId": object_id,
                "exception": e
            })
            raise e
        except Exception as e:
            Log.exception("Exception of type %s during processing" % e, extra={
                "bucketId": bucket_id,
                "objectId": object_id,
                "exception": e
            })
            # raise e

        Log.info('Finished job %s' % object_id, extra={
            "bucketId": output_bucket,
            "objectId": message.attributes.get('objectId')
        })


def process(file_path, objectId, maxDuration, output_bucket):
    """ Process downloaded file """
    # Remove from audio_files database if already present
    _clean_database_for_file(objectId)

    # Read subchunks from audio file, and update database
    _process_subchunks(file_path, objectId)

    # Split audiofiles into sub files
    generator = process_audio.process_and_split_audiofile(
        file_path, maxDuration)

    chunks = []
    first = True
    for result in generator:
        if first:
            first = False
            Log.info("Processing %s", objectId, extra={
                "header": result['header']
            })

        result['objectId'] = objectId
        chunks.append(result)

    #  Export and upload each chunk. Run multithreaded
    logging.info("Processing %i chunks in parallel on %i threads" %
                 (len(chunks), cpu_count() * 4))

    def init_pool():
        # Create a unique client for each thread
        global _bucket
        _bucket = storage.Client().get_bucket(output_bucket)

    with Pool(initializer=init_pool, processes=cpu_count() * 4) as pool:
        db_updates = pool.map(export_chunk, chunks)

    logging.info(
        "Processing finished, updating database with %i records" % len(db_updates))
    _update_db_audio_files(db_updates)

    return result['header']['ExperimentName']


def export_chunk(chunk):
    """ Exports mp3 file of chunk and uploads it """
    objectId = chunk['objectId']

    # Create MP3 file
    exported_file = process_audio.export_mp3(chunk['audio'])

    # Upload file to cloud storage
    mp3_filename = process_audio.get_destination_name(
        objectId, chunk['chunk_index_start'], 'mp3')
    _upload_file(exported_file, mp3_filename)

    # Delete local file
    os.unlink(exported_file)

    # Export WAV
    exported_file = process_audio.export_wav(chunk['audio'])
    # Upload WAV
    _upload_file(
        exported_file,
        process_audio.get_destination_name(
            objectId, chunk['chunk_index_start'], 'wav'))

    os.unlink(exported_file)

    return [
        chunk['header'],
        objectId,
        mp3_filename,
        chunk
    ]


def _process_subchunks(file_path, objectId):
    """ Reads headers from file, and updates subchunk database """
    subchunks = process_audio.read_subchunks(file_path)
    original_filename = os.path.basename(objectId)
    _update_db_audio_subchunks(subchunks, original_filename)


def _clean_database_for_file(original_filename):
    """ Removes previous entries for file in database """
    f = os.path.basename(original_filename)

    def remove_existing_file(transaction):
        row_ct = transaction.execute_update(
            "DELETE FROM %s WHERE original_filename = '%s'" % (
                AUDIO_FILES_SPANNER_TABLE, f)
        )
        Log.info("{} record(s) deleted from {}.".format(
            row_ct, AUDIO_FILES_SPANNER_TABLE))

        row_ct = transaction.execute_update(
            "DELETE FROM %s WHERE original_filename = '%s'" % (
                SUBCHUNKS_SPANNER_TABLE, f)
        )
        Log.info("{} record(s) deleted from {}.".format(
            row_ct, SUBCHUNKS_SPANNER_TABLE))

    database.run_in_transaction(remove_existing_file)


def _update_db_audio_subchunks(subchunks, filename):
    """ Inserts rows into subchunks table """
    values = []
    for chunk in subchunks:
        values.append([
            chunk['chunk_index'],
            filename,
            process_audio.t(chunk['time_start']),
            process_audio.t(chunk['time_start_original']),
            process_audio.t(chunk['time_end']),
            chunk['duration'],
            chunk['experiment_name'],
            float(chunk['time_offset']),
            datetime.now()
        ])

    logging.info("Inserting %i rows into %s" %
                 (len(values), SUBCHUNKS_SPANNER_TABLE))
    with database.batch() as batch:
        batch.insert(SUBCHUNKS_SPANNER_TABLE,
                     columns=(
                         'chunk_index',
                         'original_filename',
                         'time_start',
                         'time_start_original',
                         'time_end',
                         'duration',
                         'experiment_name',
                         'time_offset',
                         'time_added'
                     ),
                     values=values)


def _update_db_audio_files(updates):
    """ Insert audio file into database """
    values = []
    for update in updates:
        header, source_filename, filename, process_result = update
        original_filename = os.path.basename(source_filename)

        values.append([
            filename,
            original_filename,
            process_audio.t(process_result['time_start_original']),
            process_audio.t(process_result['time_start']),
            process_audio.t(process_result['time_end']),
            int(process_result['duration']),
            header['Latitude'],
            header['Longitude'],
            header['ExperimentName'],
            header['InstrumentID'],
            header['Depth'],
            process_result['chunk_index_start'],
            process_result['chunk_index_end'],
            datetime.now(),
        ])

    logging.info("Inserting %i rows into %s" %
                 (len(values), AUDIO_FILES_SPANNER_TABLE))
    with database.batch() as batch:
        batch.insert(AUDIO_FILES_SPANNER_TABLE,
                     columns=[
                         'filename',
                         'original_filename',
                         'time_start_original',
                         'time_start',
                         'time_end',
                         'duration',
                         'latitude',
                         'longitude',
                         'experiment_name',
                         'instrument_id',
                         'depth',
                         'chunk_index_start',
                         'chunk_index_end',
                         'time_added',
                     ],
                     values=values)


def _download(bucketId, objectId):
    """ Download file from cloud storage """
    try:
        tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)

        Log.info('Downloading gs://%s/%s to %s' %
                 (bucketId, objectId, tmp.name))
        blob = storage_client.get_bucket(bucketId).blob(objectId)
        blob.download_to_file(tmp)
        return tmp.name

    except NotFound as e:
        Log.error("file gs://%s/%s not found. Ignoring job" % (bucketId, objectId), extra={
            "error": e
        })
        raise e


def _upload_file(filename, destination_file_name):
    """ Upload file to cloud storage """
    Log.info("Uploading %s to %s " % (filename, destination_file_name))

    # _bucket is a global variable initialized for each thread
    blob = _bucket.blob(destination_file_name)
    blob.upload_from_filename(filename)


if __name__ == "__main__":
    if len(sys.argv) > 1:
        # objectId = os.path.basename(sys.argv[1])
        objectId = sys.argv[1]

        # Download file to local disk
        file_path = _download("pifsc-dropbox", objectId)

        process(file_path, objectId, MAX_SOUND_DURATION_SEC_DEFAULT,
                'deepblue-transcoded-audio')
        
    else:
        # In production, pull pubsub
        worker.pull_pubsub(PUBSUB_SUBSCRIPTION, pubsub_callback)
