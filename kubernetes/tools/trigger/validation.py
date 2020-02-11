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

import argparse
import multiprocessing
import os
import pprint
import re
from multiprocessing import Pool
from multiprocessing.pool import ThreadPool
import datetime
from itertools import groupby
import random

import config
import tqdm
from google.cloud import spanner, storage
import numpy
from query import query_yes_no
import trigger

pp = pprint.PrettyPrinter(indent=4)

parser = argparse.ArgumentParser("Validate jobs")

subparsers = parser.add_subparsers(dest='command')

transcode_group = subparsers.add_parser('transcode')
transcode_group.add_argument(
    "-p", "--prefix", help="Filter based on file prefix")

spectrogram_group = subparsers.add_parser('spectrogram')
spectrogram_group.add_argument(
    "-p", "--prefix", help="Filter based on file prefix")
spectrogram_group.add_argument(
    "-m", "--max-age", help="Max age of files in hours")
spectrogram_group.add_argument(
    "--no-denoise", action="store_true", help="Generate denoise spectrograms")
spectrogram_group.add_argument(
    "--no-normal", action="store_true", help="Generate normal spectrograms")


tile_group = subparsers.add_parser('tile')
tile_group.add_argument("-p", "--prefix", help="Filter based on file prefix")
tile_group.add_argument(
    "-m", "--max-age", help="Max age of files in hours")

storage_client = config.storage_client()
transcoded_bucket = storage_client.get_bucket(
    config.TRANSCODE_DESTINATION_BUCKET)
spectrogram_bucket = storage_client.get_bucket(
    config.SPECTROGRAM_DESTINATION_BUCKET)
denoise_spectrogram_bucket = storage_client.get_bucket(
    config.DENOISE_SPECTROGRAM_DESTINATION_BUCKET)
tile_bucket = storage_client.get_bucket(config.TILE_DESTINATION_BUCKET)

database = config.spanner_database()


def fetch_spanner_audio_subchunks(original_filename):
    with database.snapshot() as snapshot:
        results = snapshot.execute_sql(
            "SELECT chunk_index, time_added "
            "FROM audio_subchunks "
            "WHERE original_filename = '"+original_filename+"' "
            "ORDER BY chunk_index "
        )
        res = []
        for row in results:
            res.append(row)
        return res

def fetch_raw_filelist():
    raw_bucket = config.storage_client().get_bucket(config.RAW_AUDIO_BUCKET_NAME)

    prefix = config.RAW_AUDIO_BUCKET_SUBFOLDER
    if args.prefix:
        prefix += args.prefix

    files = []
    for o in raw_bucket.list_blobs(prefix=prefix):
        files.append(o.name)
    return files

def fetch_spanner_audio_files(original_filename):
    with database.snapshot() as snapshot:
        results = snapshot.execute_sql(
            "SELECT filename, time_added, chunk_index_start, chunk_index_end "
            "FROM audio_files "
            "WHERE original_filename = '"+original_filename+"' "
            "ORDER BY chunk_index_start "
        )
        res = []
        for row in results:
            res.append(row)
        return res


def fetch_spanner_all_audio_files():
    with database.snapshot() as snapshot:
        query = """
        SELECT filename, time_added, original_filename, time_start, time_end, experiment_name, original_filename
        FROM audio_files """

        if args.prefix:
            query += "WHERE STARTS_WITH(filename,\""+args.prefix+"\") "
        query += " ORDER BY filename "

        results = snapshot.execute_sql(query)
        res = []
        for row in results:
            res.append(row)
        return res


def fetch_distinct_original_filenames_from_db():
    with database.snapshot() as snapshot:
        query = """
        SELECT DISTINCT original_filename
        FROM audio_files
        """

        if args.prefix:
            query += "WHERE STARTS_WITH(filename,\""+args.prefix+"\") "

        results = snapshot.execute_sql(query)
        res = []
        for row in results:
            res.append(row[0])
        return res


def validate_transcoded_audio(original_filepath):
    ret = []
    original_filename = os.path.basename(original_filepath)
    f = os.path.basename(original_filename)
    f = os.path.splitext(f)[0]
    spanner_files = fetch_spanner_audio_files(original_filename)
    spanner_subchunks = fetch_spanner_audio_subchunks(original_filename)

    if len(spanner_files) < 1 or len(spanner_subchunks) < 1:
        ret.append({
            'error': 'missing_file',
            'solution_prefix': original_filename
        })
    else:
        _bucket_files = transcoded_bucket.list_blobs(prefix=f)
        
        # Check all subchunks are represented in files
        for subchunk in spanner_subchunks:
            index = int(subchunk[0])
            files = [x for x in spanner_files if int(
                x[2]) <= index and int(x[3]) >= index]
            if len(files) != 1:
                print(files)
                ret.append({
                    'error': 'missing_subchunks',
                    'chunk_index': index,
                    'solution_prefix': original_filename
                })

        # Check all files have a size, and a made after ingest time
        time = spanner_subchunks[0][1]
        bucket_files = []
        for bf in _bucket_files:
            if bf.name in [x[0] for x in spanner_files] or bf.name in [x[0].replace('.mp3','.wav') for x in spanner_files]:
                bucket_files.append(bf.name)
                if bf.size < 1024:
                    ret.append({
                        'error': 'faulty_files',
                        'path': bf.path,
                        'solution_prefix': original_filename
                    })
                    # print("%s file is 0 bytes" % bf.path)

                if bf.updated < time:
                    ret.append({
                        'error': 'outdated_files',
                        'path': bf.path,
                        'ingest_time': time,
                        'file_updated': bf.updated,
                        'solution_prefix': original_filename
                    })
        # Check files exist
        for spanner_file in spanner_files:
            # storage_files = [ x for x in bucket_files if x == spanner_file[0] ]
            if spanner_file[0] not in bucket_files:
                ret.append({
                    'error': 'missing_file',
                    'path': spanner_file[0],
                    'solution_prefix': original_filename
                })
            if spanner_file[0].replace('.mp3','.wav') not in bucket_files:
                ret.append({
                    'error': 'missing_file_wav',
                    'path': spanner_file[0],
                    'solution_prefix': original_filename
                })
    return ret


def validate_spectrogram_file(g):
    prefix = g['prefix']
    rows = g['rows']
    ret = []

    _bucket_files = spectrogram_bucket.list_blobs(prefix=prefix)
    _bucket_files_denoise = denoise_spectrogram_bucket.list_blobs(prefix=prefix)
    bucket_files = []

    if not args.no_normal:
        for blob in _bucket_files:
            bucket_files.append([blob.name, blob.updated])
            solution = re.sub(r'\.\d+\.mp3(\.png)?', ".wav", blob.name)
            if blob.size <= 1024:
                ret.append({
                    'error': 'faulty_file',
                    'path': blob.path,
                    'solution_prefix': solution
                })

    if not args.no_denoise:
        for blob in _bucket_files_denoise:
            bucket_files.append([blob.name, blob.updated])
            solution = re.sub(r'\.\d+\.mp3(\.png)?', ".wav", blob.name)
            if blob.size <= 1024:
                ret.append({
                    'error': 'faulty_file',
                    'path': blob.path,
                    'solution_prefix': solution
                })

    for row in rows:
        filename = row[0].replace('.mp3','.wav')
        # solution = re.sub(r'\.\d+\.mp3(\.png)?', ".wav", filename)
        solution = row[6]
        blobs = [b for b in bucket_files if b[0] == filename+'.png']       
            

        if not blobs:
            ret.append({
                'error': 'missing_file',
                'path': filename+".png",
                'solution_prefix': solution
            })

        for b in blobs:
            if b[1] < row[1]:
                ret.append({
                    'error': 'outdated_file',
                    'path': filename+".png",
                    'ingest_time': row[1],
                    'file_updated': b[1],
                    'solution_prefix': solution
                })
        
            elif args.max_age \
                and b[1].replace(tzinfo=None) <  datetime.datetime.now() - datetime.timedelta(hours=float(args.max_age)):
                ret.append({
                    'error': 'outdated_file',
                    'path': filename+".png",
                    'ingest_time': row[1],
                    'file_updated': b[1],
                    'solution_prefix': solution
                })
    return ret


def run_transcode_validation():
    raw_files = fetch_raw_filelist()
    # original_filenames = fetch_distinct_original_filenames_from_db()
    print("")
    print("Will validate %i raw files" % len(raw_files))
    print("")
    print("Validating:") 
    print("- all chunks exist in database")
    print("- all files exist in database, and all chunks are represented")
    print("- all files are in cloud storage")

    errors = run(validate_transcoded_audio, raw_files,  'transcode')

    if errors:
        u = list(set([x['solution_prefix'] for x in errors]))
        print(u)
        if query_yes_no("Trigger transcode job for %i files?" % len(u)):
            publish_client = config.pubsub_client()
            
            for filename in u:
                print(config.RAW_AUDIO_BUCKET_SUBFOLDER+filename)
                trigger.trigger_transcode(config.RAW_AUDIO_BUCKET_SUBFOLDER+filename, publish_client)
    else:
        print("🎉 Validation complete. 0 Errors! 🎉")



def run_spectrogram_validation():
    files = fetch_spanner_all_audio_files()
    print("")
    print("Will validate %i files" % len(files))
    print("")
    print("Validating:") 
    print("- all png's have been created")
    print("- all png's are newer than the mp3 files")

    from itertools import groupby
    groups = []
    for key, valuesiter in groupby(files, key=lambda x: re.sub(r'\d+\.mp3', "", x[0])):
        groups.append({
            'prefix': key,
            'rows': list(valuesiter)
        })

    errors = run(validate_spectrogram_file, groups, 'spectrogram')

    if errors:
        u = list(set([x['solution_prefix'] for x in errors]))
        print(u)
        if query_yes_no("Trigger spectrogram generation job for %i files?" % len(u)):
            publish_client = config.pubsub_client()
            if query_yes_no("Genereate new filelist?" ):
                trigger.generate_temp_filelist()
            for filename in u:
                experiment_name = "Hawaii19" # TODO CHANGE THIS!
                trigger.trigger_spectrogram(filename, experiment_name, publish_client, not args.no_denoise, not args.no_normal)
                        

    else:
        print("🎉 Validation complete. 0 Errors! 🎉")



def tile_subset(start_time, end_time, zoom_level):
    division = pow(2, zoom_level)
    duration = (1 / division) * 3600

    sec = config.unix_time_seconds(start_time)
    remainder = sec % duration

    ret = []
    for sec in numpy.arange(config.unix_time_seconds(start_time), config.unix_time_seconds(end_time), duration):
        remainder = sec % duration
        t = sec - remainder

        d = datetime.datetime.utcfromtimestamp(t)
        ret.append({
            'time': d,
            'zoom_level': zoom_level,
            'time_end': d + datetime.timedelta(seconds=duration),
        })

    # print(start_time, end_time, t)
    return ret


def validate_tile_files(g):
    prefix = g['prefix']
    rows = g['rows']
    ret = []
    _bucket_files = tile_bucket.list_blobs(prefix=prefix)
    bucket_files = []

    for blob in _bucket_files:
        bucket_files.append([blob.name, blob.updated, blob.size])

    for row in rows:
        filename = row[0]
        file_time_updated = row[1]['file_time_updated']
        spectrogram_time_updated = row[1]['spectrogram_time_updated']
        solution = filename
        data = row[1]
        blobs = [b for b in bucket_files if b[0] == filename]
        
        # spectrogram_blobs = [b for b in spectrogram_files if b[0] == filename]

        # print(blobs[0][1],  file_time_updated, spectrogram_time_updated)
        if not blobs:
            ret.append({
                'error': 'missing_file',
                'path': filename,
                'solution_prefix': solution,
                'data': data
            })

        elif blobs[0][1] < file_time_updated:
            ret.append({
                'error': 'outdated_file',
                'path': filename,
                'ingest_time': file_time_updated,
                'file_updated': blobs[0][1],
                'solution_prefix': solution,
                'data': data
            })
        elif spectrogram_time_updated and blobs[0][1] < spectrogram_time_updated:
            ret.append({
                'error': 'outdated_file_spectrogram',
                'path': filename,
                'ingest_time': spectrogram_time_updated,
                'file_updated': blobs[0][1],
                'solution_prefix': solution,
                'data': data
            })
        elif args.max_age and \
            blobs[0][1].replace(tzinfo=None) <  datetime.datetime.now() - datetime.timedelta(hours=float(args.max_age)):
            ret.append({
                'error': 'outdated_file',
                'path': filename,
                'ingest_time': file_time_updated,
                'file_updated': blobs[0][1],
                'solution_prefix': solution,
                'data': data
            })
        elif blobs[0][2] == 0:
            ret.append({
                'error': 'faulty_file',
                'path': filename,
                'solution_prefix': solution,
                'data': data
            })
    return ret

def run_tile_validation():
    # Fetch all audio files 
    files = fetch_spanner_all_audio_files()
    print("Will validate %i audio files" % len(files))

    print("Fetching spectrogram filelist")
    # Fetch all spectrogram files
    spectrogram_files = {}
    for blob in spectrogram_bucket.list_blobs(prefix=args.prefix):
        spectrogram_files[blob.name] = [blob.name, blob.updated, blob.size]
  
    print("Fetching denoised spectrogram filelist")
    # Fetch all denoised spectrogram files
    spectrogram_denoise_files = {}
    for blob in denoise_spectrogram_bucket.list_blobs(prefix=args.prefix):
        spectrogram_denoise_files[blob.name] = [blob.name, blob.updated, blob.size]

    expected_files = dict()

    print("Calculating tiles")
    for f in tqdm.tqdm(files):
        filename, file_time_updated, original_filename, time_start, time_end, experiment_name, original_filename = f
        
        location_name = trigger.get_location_name(experiment_name)
        
        spectrogram_filename = filename.replace('.mp3','.wav.png')

        # Find spectrogram blobs for specific audio file
        # spectrogram_blobs = [b for b in spectrogram_files if b[0] == spectrogram_filename ]
        # denoise_spectrogram_blobs = [b for b in spectrogram_denoise_files if b[0] == spectrogram_filename ]
        spectrogram_blobs = [ spectrogram_files[spectrogram_filename] ]
        denoise_spectrogram_blobs = [ spectrogram_denoise_files[spectrogram_filename] ]

        spectrogram_time_updated = None
        denoise_spectrogram_time_updated = None

        if spectrogram_blobs:
            spectrogram_time_updated = spectrogram_blobs[0][1]
        if denoise_spectrogram_blobs:
            denoise_spectrogram_time_updated = denoise_spectrogram_blobs[0][1]

        # Iterate through zoom levels
        for zoom_level in range(int(config.SPECTROGRAM_TILE_MIN_ZOOM), int(config.SPECTROGRAM_TILE_MAX_ZOOM)+1):
            tiles = tile_subset(time_start, time_end, zoom_level)
            
            # Iterate through tiles a given file is in
            for s in tiles:
                group_by = "tiles-%i/%s/" % (zoom_level, location_name)
                group_by_denoise = "tiles-%i-denoise/%s/" % (zoom_level, location_name)
                dest = trigger.get_tile_filepath(zoom_level, location_name, s['time'])
                
                if zoom_level < 0:
                    group_by = "tiles-n%i/%s/" % (-zoom_level, location_name)                 
                    group_by_denoise = "tiles-n%i-denoise/%s/" % (-zoom_level, location_name)                 
                if zoom_level > -3:
                    group_by += s['time'].strftime("%Y_%m")
                    group_by_denoise += s['time'].strftime("%Y_%m")
                if zoom_level > 3:
                    group_by += s['time'].strftime("_%dT")
                    group_by_denoise += s['time'].strftime("_%dT")
                # if zoom_level > 6:
                #     group_by += s['time'].strftime("%H_")
                #     group_by_denoise += s['time'].strftime("%H_")

                # Check if tile is already
                if dest not in expected_files:
                    expected_files[dest] = {
                        'file_time_updated': file_time_updated,
                        'spectrogram_time_updated': spectrogram_time_updated,
                        'zoom_level': zoom_level,
                        'time_start': s['time'],
                        'time_end': s['time_end'],
                        'experiment_name': location_name,
                        'group_by': group_by,
                        'denoise': False
                    }
                
                # Check if file is more recent
                if expected_files[dest]['file_time_updated'] < file_time_updated:
                    expected_files[dest]['file_time_updated'] = file_time_updated
                if expected_files[dest]['spectrogram_time_updated'] < spectrogram_time_updated:
                    expected_files[dest]['spectrogram_time_updated'] = spectrogram_time_updated
                
            
                # Repeat for denoise tiles
                dest = trigger.get_tile_filepath(zoom_level, location_name, s['time'], denoise=True)

                if dest not in expected_files:
                    expected_files[dest] = {
                        'file_time_updated': file_time_updated,
                        'spectrogram_time_updated': denoise_spectrogram_time_updated,
                        'zoom_level': zoom_level,
                        'time_start': s['time'],
                        'time_end': s['time_end'],
                        'experiment_name': location_name,
                        'group_by': group_by_denoise,
                        'denoise': True
                    }
                
                # Check if file is more recent
                if expected_files[dest]['file_time_updated'] < file_time_updated:
                    expected_files[dest]['file_time_updated'] = file_time_updated
                if expected_files[dest]['spectrogram_time_updated'] < denoise_spectrogram_time_updated:
                    expected_files[dest]['spectrogram_time_updated'] = denoise_spectrogram_time_updated
                

    l = [[k, v] for k, v in expected_files.items()]
    l.sort(key=lambda x: x[1]['group_by'])

    print("Expecting %i tile files" % len(expected_files))

    # Group the jobs
    groups = []
    for key, valuesiter in groupby(l, key=lambda x: x[1]['group_by']):
        groups.append({
            'prefix': key,
            'rows': list(valuesiter),
            'spectrogram_files': spectrogram_files
        })

    for g in groups:
        print(g['prefix'], len(g['rows']))
    
    errors = run(validate_tile_files, groups, 'tile')
    if errors:
        if query_yes_no("Trigger spectrogram tiling generation job for %i files?" % len(errors)):
            if query_yes_no("Genereate new filelist?" ):
                trigger.generate_temp_filelist()
                
            
            publish_client = config.pubsub_client(max_messages=100)
            random.shuffle(errors)

            for err in tqdm.tqdm(errors):
                data = err['data']
                trigger.trigger_tile(data['zoom_level'], data['experiment_name'],
                                     data['time_start'], data['time_end'], publish_client, denoise=data['denoise'])
    else:
        print("🎉 Validation complete. 0 Errors! 🎉")


def run(fn, lst, job):
    errors = []
    with ThreadPool(24) as p:
        rets = list(tqdm.tqdm(p.imap_unordered(fn, lst), total=len(lst)))
    for ret in rets:
        if ret:
            errors.extend(ret)

    pp.pprint(errors[:100])

    return errors


if __name__ == '__main__':
    args = parser.parse_args()

    if args.command == 'transcode':
        run_transcode_validation()

    if args.command == 'spectrogram':
        run_spectrogram_validation()

    if args.command == 'tile':
        run_tile_validation()
