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

#!/usr/bin/python
# coding=utf-8

import os
import argparse
import sys
import datetime
import random

from query import query_yes_no
import config
import tempfile
import csv
import re
import tqdm



#
# SETTINGS
#

TRANSCODE_MAX_SOUND_DURATION_SEC = 75

SPECTROGRAM_TILE_WIDTH = 512

#
# END SETTINGS
#

parser = argparse.ArgumentParser("Trigger jobs")

subparsers = parser.add_subparsers(dest='command')

transcode_group = subparsers.add_parser('transcode')
transcode_group.add_argument(
    "-p", "--prefix", help="Filter based on file prefix")

spectrogram_group = subparsers.add_parser('spectrogram')
spectrogram_group.add_argument(
    "-p", "--prefix", help="Filter based on file prefix")
spectrogram_group.add_argument(
    "--no-denoise", action="store_true", help="Generate denoise spectrograms")
spectrogram_group.add_argument(
    "--no-normal", action="store_true", help="Generate normal spectrograms")
spectrogram_group.add_argument("-m", "--max-count", type=int, help="max number jobs")

tile_group = subparsers.add_parser('tile')
tile_group.add_argument("-p", "--prefix", help="Filter based on file prefix")
tile_group.add_argument("-m", "--max-count", help="max number jobs")
tile_group.add_argument("--min-zoom", help="Minimum zoom level",
                        default=config.SPECTROGRAM_TILE_MIN_ZOOM)
tile_group.add_argument("--max-zoom", help="Maximum zoom level",
                        default=config.SPECTROGRAM_TILE_MAX_ZOOM)

similarity_group = subparsers.add_parser('similarity')
similarity_group.add_argument("-p", "--prefix", help="Filter based on file prefix")
similarity_group.add_argument("-m", "--max-count", help="max number jobs")

# group = parser.add_mutually_exclusive_group(required=True)
# group.add_argument("-t", "--transcode", help="Run transcode job", action="store_true")
# group.add_argument("-c", "--cluster-classifier", help="Run cluster classifier", action="store_true")
# group.add_argument("-s", "--spectrogram", help="Generate spectrograms", action="store_true")
# group.add_argument("-x", "--spectrogram-tiles", help="Generate spectrogram tiles", action="store_true")

# parser.add_argument("-p", "--prefix", help="filter based on prefix")

def trigger_transcode(objectId, publish_client):
    publish_client.publish('projects/'+config.CLOUD_PROJET+'/topics/raw_audio_added', b'',
        objectId=objectId,
        bucketId=config.RAW_AUDIO_BUCKET_NAME,
        outputBucket=config.TRANSCODE_DESTINATION_BUCKET,
        maxChunkDuration=str(TRANSCODE_MAX_SOUND_DURATION_SEC))


def trigger_tile(zoom_level, experiment_name, time_start, time_end, publish_client, denoise=False):
    postfix = ''
    bucket_name = 'deepblue-spectrograms'
    
    if denoise:
        bucket_name = 'deepblue-spectrograms-denoise'
        postfix = '-denoise'


    destination = "tiles-%i%s/%s/%s.jpg" % (
        zoom_level, postfix, experiment_name, time_start.strftime("%Y_%m_%dT%H_%M_%S"))
    if zoom_level < 0:
        destination = "tiles-n%i%s/%s/%s.jpg" % (-zoom_level, postfix,
                                               experiment_name, time_start.strftime("%Y_%m_%dT%H_%M_%S"))
    # print("Trigger: "+destination)

    time_start = time_start.replace(tzinfo=datetime.timezone.utc)
    time_end = time_end.replace(tzinfo=datetime.timezone.utc)

    publish_client.publish('projects/gweb-deepblue/topics/tile_spectrograms', b'',
                           width=str(SPECTROGRAM_TILE_WIDTH),
                           zoom_level=str(zoom_level),
                           experiment_name=experiment_name,
                           bucket_name=bucket_name,
                           time_start=datetime.datetime.strftime(
                               time_start, "%Y-%m-%d %H:%M:%S.%f %z"),
                           time_end=datetime.datetime.strftime(
                               time_end, "%Y-%m-%d %H:%M:%S.%f %z"),
                           destination=destination)

def trigger_similarity(zoom_level, location_name, time_start, time_end, publish_client):
    postfix = ''
    bucket_name = 'deepblue-spectrograms-denoise'

    destination = "tiles-%i%s/%s/%s.jpg" % (
        zoom_level, postfix, location_name, time_start.strftime("%Y_%m_%dT%H_%M_%S"))
    if zoom_level < 0:
        destination = "tiles-n%i%s/%s/%s.jpg" % (-zoom_level, postfix,
                                               location_name, time_start.strftime("%Y_%m_%dT%H_%M_%S"))

    time_start = time_start.replace(tzinfo=datetime.timezone.utc)
    time_end = time_end.replace(tzinfo=datetime.timezone.utc)

    publish_client.publish('projects/gweb-deepblue/topics/generate_similarity', b'',
                           window_size=str(config.SIMILARITY_WINDOW_SIZE),
                           downsample=str(config.SIMILARITY_DOWNSAMPLE),
                           zoom_level=str(zoom_level),
                           location_name=location_name,
                           bucket_name=bucket_name,
                           time_start=datetime.datetime.strftime(
                               time_start, "%Y-%m-%d %H:%M:%S.%f %z"),
                           time_end=datetime.datetime.strftime(
                               time_end, "%Y-%m-%d %H:%M:%S.%f %z"),
                           destination=destination)


def trigger_spectrogram(filename, experiment_name, publish_client, denoise=True, normal=True):
    publish_client.publish('projects/gweb-deepblue/topics/raw_audio_transcoded', b'',
                            filename=filename,
                            bucketId=config.TRANSCODE_DESTINATION_BUCKET,
                            experiment_name=experiment_name,
                            denoise=str(denoise),
                            normal=str(normal),
                            eventType="OBJECT_FINALIZE")

def get_location_name(experiment_name):
    search = re.search(r'^(\D+)(\d+)', experiment_name)
    return search.group(1)

def get_tile_filepath(zoom_level, location_name, time, denoise=False):
    d = ''
    if denoise:
        d = '-denoise'
    dest = "tiles-%i%s/%s/%s.jpg" % (zoom_level,
                                d,
                                location_name,
                                time.strftime("%Y_%m_%dT%H_%M_%S"))
    if zoom_level < 0:
        dest = "tiles-n%i%s/%s/%s.jpg" % (-zoom_level,
                                    d,
                                    location_name, 
                                    time.strftime("%Y_%m_%dT%H_%M_%S"))
    return dest

def generate_temp_filelist():
    print("Generating filelist")
    with config.spanner_database().snapshot() as snapshot:
        query = "SELECT experiment_name, filename, time_start, time_end, original_filename FROM audio_files "
        results = snapshot.execute_sql(query)

        data = dict()
        for res in results:
            # Group on location name
            location_name = get_location_name(res[0])
            if location_name not in data:
                data[location_name] = []

            data[location_name].append([res[1], res[2].timestamp(), res[3].timestamp(), res[4]])

        bucket = config.storage_client().get_bucket(config.TEMP_BUCKET)
        for experiment_name in data.keys():
            f = tempfile.NamedTemporaryFile(suffix=".csv", mode='w')
            writer = csv.writer(f, delimiter=',', quotechar='"', quoting=csv.QUOTE_MINIMAL)
            
            for row in data[experiment_name]:
                writer.writerow(row)
            
            f.seek(0)
            blob = bucket.blob(experiment_name+".csv")
            blob.upload_from_filename(f.name)     
            print("Uploaded %s "% (experiment_name+".csv"))   

if __name__ == '__main__':    
    # generate_temp_filelist()
    args = parser.parse_args()
    # TRANSCODE
    if args.command == 'transcode':
        raw_bucket = config.storage_client().get_bucket(config.RAW_AUDIO_BUCKET_NAME)

        prefix = config.RAW_AUDIO_BUCKET_SUBFOLDER
        if args.prefix:
            prefix += args.prefix

        files = []
        for o in raw_bucket.list_blobs(prefix=prefix):
            print("Will trancode: gs://%s/%s" %
                  (config.RAW_AUDIO_BUCKET_NAME, o.name))
            files.append(o.name)

        if query_yes_no("Trigger transcode of %i files?" % len(files)):
            print("Triggering transcode")
            publish_client = config.pubsub_client()
            for o in files:
                trigger_transcode(o, publish_client)
                
    # # GENERATE SPECTROGRAM
    if args.command == 'spectrogram':
        with config.spanner_database().snapshot() as snapshot:
            query = "SELECT DISTINCT original_filename, experiment_name FROM audio_files "

            if args.prefix:
                query += "WHERE STARTS_WITH(filename,\""+args.prefix+"\")"

            results = snapshot.execute_sql(query)

            files = []
            for row in results:
                files.append(row)

            if args.max_count:
                files = files[:args.max_count]

            for row in files:
                print("Will run spectrogram generator: "+row[0]+' '+row[1])

            if query_yes_no("Trigger spectrogram generation job for %i files?" % len(files)):
                if query_yes_no("Genereate new filelist" ):
                    generate_temp_filelist()

                print("Triggering jobs")
                publish_client = config.pubsub_client()

                for o in files:
                    trigger_spectrogram(o[0], o[1], publish_client, not args.no_denoise, not args.no_normal)
                    
    def subsets(start_time, location_name, zoom_level, row_index):
        ret = []
        division = pow(2, zoom_level)
        if division >= 1:
            for i in range(division):
                t = row[0] + datetime.timedelta(seconds=i * 60*60 / division)
                ret.append({
                    "zoom_level": (zoom_level),
                    "experiment_name": location_name,
                    "time_start": t,
                    "time_end": t + datetime.timedelta(seconds=60*60 / division),
                })
            return ret
        elif division < 1:
            t = row[0]
            mod = config.unix_time_seconds(row[0]) % ((1 / division) * 3600)

            if row_index == 0:
                t = t - datetime.timedelta(seconds=mod)
            elif mod != 0.0:
                return []

            return [{
                "zoom_level": (zoom_level),
                "experiment_name": location_name,
                "time_start": t,
                "time_end":t + datetime.timedelta(seconds=60*60 / division),
            }]

    # GENEREATE SPECTROGRAM TILES
    if args.command == 'tile':
        with config.spanner_database().snapshot() as snapshot:
            query = "SELECT TIMESTAMP_TRUNC(time_start, HOUR), experiment_name FROM audio_files "

            if args.prefix:
                query += "WHERE STARTS_WITH(filename,\""+args.prefix+"\") "

            query += "GROUP BY TIMESTAMP_TRUNC(time_start, HOUR), experiment_name "

            if args.max_count:
                query += " LIMIT %s " % (args.max_count * 4)
                # query += " LIMIT 100 offset 1"

            results = snapshot.execute_sql(query)

            rows = []
            for index, row in enumerate(results):
                for i in range(int(args.min_zoom), int(args.max_zoom)+1):
                    rows.extend(subsets(row[0], get_location_name(row[1]), i, index))

                # rows.extend(subsets(row, -5))

            if args.max_count:
                if len(rows) > int(args.max_count):
                    rows = rows[0:int(args.max_count)]

            for row in rows[:100]:
                print("Will run spectrogram-tiler: %s" % row)
            if len(rows) > 100:
                print(" .... and %i more" % (len(rows)-100))

            if query_yes_no("Trigger %i spectrogram tile generation job? This has to run when transcode and spectrogram generation is finished" % len(rows)):
                if query_yes_no("Genereate new filelist" ):
                    generate_temp_filelist()
                print("Triggering jobs")
                publish_client = config.pubsub_client(max_messages=100)
                random.shuffle(rows)
                for o in tqdm.tqdm(rows):
                    trigger_tile(o['zoom_level'], o['experiment_name'],
                                 o['time_start'], o['time_end'], publish_client)
                    trigger_tile(o['zoom_level'], o['experiment_name'],
                                 o['time_start'], o['time_end'], publish_client, denoise=True)


     # GENEREATE SIMILARITY TILES
    if args.command == 'similarity':
        with config.spanner_database().snapshot() as snapshot:
            query = "SELECT TIMESTAMP_TRUNC(time_start, HOUR), experiment_name FROM audio_files "

            if args.prefix:
                query += "WHERE STARTS_WITH(filename,\""+args.prefix+"\") "

            query += "GROUP BY TIMESTAMP_TRUNC(time_start, HOUR), experiment_name "

            if args.max_count:
                query += " LIMIT %s " % (args.max_count * 4)
                # query += " LIMIT 100 offset 1"

            results = snapshot.execute_sql(query)

            zoom_level = config.SIMILARITY_ZOOM_LEVEL
            rows = []
            for index, row in enumerate(results):
                rows.extend(subsets(row[0], get_location_name(row[1]), zoom_level, index))

            if args.max_count:
                if len(rows) > int(args.max_count):
                    rows = rows[:int(args.max_count)]

            for row in rows[:100]:
                print("Will run similarity job: %s" % row)
            if len(rows) > 100:
                print(" .... and %i more" % (len(rows)-100))

            if query_yes_no("Trigger %i similarity tile generation job? This has to run when transcode and spectrogram generation is finished" % len(rows)):
                # print("Generating filelist")
                if query_yes_no("Genereate new filelist" ):
                    generate_temp_filelist()
                print("Triggering jobs")
                publish_client = config.pubsub_client()
                random.shuffle(rows)
                for o in tqdm.tqdm(rows):
                    trigger_similarity(o['zoom_level'], o['experiment_name'],
                                 o['time_start'], o['time_end'], publish_client)
                  
