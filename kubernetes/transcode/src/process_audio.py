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

import time
from transcode.src.read_xwav_header import read_header
import sys
from pydub import AudioSegment
import struct
import datetime
import logging
import os
import tempfile


Log = logging.getLogger(__name__)

# Helper function
def t(time):
    return (datetime.datetime.fromtimestamp(time/1000))

def read_subchunks(filename):
    # Open raw file
    try:
        fileIn = open(filename, 'rb')
    except IOError as e:
        print("Could not open input file %s" % (sys.argv[1]))
        raise e

    filesize = os.fstat(fileIn.fileno()).st_size
    
    # Read header of raw file
    header = read_header(fileIn)
    fileIn.close()

    # Sort chunks after time
    header['SubChunks'].sort(key=lambda x: x['time'])

    offsets = calculate_offsets(header)

    ret = []
    for index, chunk in enumerate(header['SubChunks']):
        duration = offsets[index][1] / 1000.0
        time_start = chunk['time'] + offsets[index][0]
        
        if chunk['byte_loc'] + chunk['byte_length'] <= filesize:
            ret.append({
                'chunk_index': index,
                'duration': duration,
                'time_start': time_start,
                'time_start_original': chunk['time'],
                'time_end': chunk['time'] + offsets[index][0] + duration * 1000,
                'time_offset': offsets[index][0],
                'experiment_name': header['ExperimentName'],
                'instrument_id': header['InstrumentID'],
                'header': chunk
            })
        else: 
            Log.warn("Skipping chunk %i, file to short" % index)

    return ret

# If chunks are overlapping, try and offset them or shorten them as last resort
def calculate_offsets(header):
    ret = []
    prev_end_time = 0

    chunks = []
    for index, chunk in enumerate(header['SubChunks']):
        subchunk_header = header['SubChunks'][index]
        
        duration = 1000 * chunk['byte_length'] / int(header['BitsPerSample']/8) / header['SampleRate']
        start_time = subchunk_header['time']        
        end_time = start_time + duration

        chunks.append([start_time, end_time])

    chunks.sort(key=lambda x: -x[0])

    offsets = []
    for index, chunk in enumerate(chunks):
        offset = 0
        duration = chunk[1] - chunk[0]

        if index == 0:
            pass
        elif index == len(chunks)-1:
            # Last one (which is the first one...) should crop if needed
            diff_after = chunks[index-1][0] - chunk[1]
            if diff_after < 0:
                duration = max(duration+diff_after, 0)

        else:
            diff_before = chunk[0] - chunks[index+1][1]
            diff_after = chunks[index-1][0] - chunk[1]

            if diff_after < 0:
                offset = diff_after

            chunk[0] += offset
            chunk[1] += offset

        offsets.insert(0, [offset, duration])

    # Debug
    # chunks.sort(key=lambda x: x[0])
    # for index, chunk in enumerate(chunks):
    #     if index == 0 or index == len(chunks)-1:
    #         print(offsets[index])
    #         pass
    #     else:
    #         diff_before = chunk[0] - chunks[index-1][1]
    #         diff_after = chunks[index+1][0] - chunk[1]

    #         print(diff_before, diff_after, offsets[index])
    #         print(t(chunk[0]), t(chunk[1]))
        
    #     byte_length = int((offsets[index][1] / 1000) * int(header['BitsPerSample']/8) * header['SampleRate'])
    #     print(byte_length, header['SubChunks'][index]['byte_length'])

    return offsets
    
# 
def process_and_split_audiofile(filename, maxDuration):
    subchunks = read_subchunks(filename)

    # Open raw file
    try:
        fileIn = open(filename, 'rb')
    except IOError as e:
        print("Could not open input file %s" % (sys.argv[1]))
        raise e
    
    header = read_header(fileIn)

    aggregate_sound = None
    aggregate_start_time = None
    aggregate_chunk_index = 0
    
    prev_start_time = 0
    prev_duration_millis = 0
    prev_offset = 0

    print("Num chunks: %d max duration of aggregate chunks: %d" % (len(subchunks), maxDuration))
    
    for i, subchunk in enumerate(subchunks):
        subchunk_header = subchunk['header']
        start_time = subchunk['time_start']
        byte_length = int((subchunk['duration']) * int(header['BitsPerSample']/8) * header['SampleRate'])
        
        fileIn.seek(subchunk_header['byte_loc'])
        read = fileIn.read(byte_length)        
        
        # Create audio element
        sound = AudioSegment(
            data=read,
            sample_width=int(header['BitsPerSample']/8),
            frame_rate=header['SampleRate'],
            channels=header['NumChannels']
        ) 

        if sound.duration_seconds != subchunk['duration']:
            raise Exception("Could not parse audio file. Expected duration of chunk %i to be %f, but was %f" % (i, subchunk['duration'], sound.duration_seconds))

        # Aggregate all files that are back to back, up to a max duration
        if aggregate_sound is None:
            aggregate_start_time = start_time
            aggregate_start_chunk = subchunk
            aggregate_sound = sound
            aggregate_chunk_index = i
        else:
            diff = start_time - prev_start_time
            
            if diff < 0:
                Log.warn("Chunks timecode %s is before previous timecode %s" % (t(start_time), t(prev_start_time)))
                # raise Exception("Chunks timecode %s is before previous timecode %s" % (t(start_time), t(prev_start_time)))
            if len(sound) > diff:
                Log.warn("Chunk produced audio of duration %ds, but delta in timestamps is only %ds" % (sound.duration_seconds, diff / 1000))
                # raise Exception("Chunk produced audio of duration %ds, but delta in timestamps is only %ds" % (sound.duration_seconds, diff / 1000))

            if diff > prev_duration_millis \
                or aggregate_sound.duration_seconds + sound.duration_seconds > maxDuration:
                
                yield {
                    'audio': aggregate_sound, 
                    'header': header, 
                    'time_start_original': aggregate_start_chunk['time_start_original'],
                    'time_start': aggregate_start_time,
                    'time_end': aggregate_start_time + len(sound),
                    'chunk_index_start': aggregate_chunk_index,
                    'chunk_index_end': i-1,
                    'time_offset': subchunk['time_offset'],
                    'duration': sound.duration_seconds
                }
                aggregate_start_time = start_time
                aggregate_start_chunk = subchunk    
                aggregate_sound = sound
                aggregate_chunk_index = i
            else:
                aggregate_sound = aggregate_sound + sound

        prev_start_time = start_time
        prev_duration_millis = len(sound)
        prev_offset = subchunk['time_offset']

    yield {
        'audio': aggregate_sound, 
        'header': header, 
        'time_start_original': aggregate_start_chunk['time_start_original'],
        'time_start': aggregate_start_time,
        'time_end': aggregate_start_time + len(sound),
        'chunk_index_start': aggregate_chunk_index,
        'chunk_index_end': len(subchunks)-1,
        'time_offset': subchunks[-1]['time_offset'],
        'duration': sound.duration_seconds
    }
    
    fileIn.close()


def get_destination_name(filename, chunk_index, filetype):
    # dt = datetime.datetime.fromtimestamp(time/1000)
    # return '%s_%s_%s.%s' % (header['ExperimentName'],header['InstrumentID'], dt.strftime('%Y_%m_%dT%H_%M_%S'), filetype)
    f = os.path.basename(filename)
    f = os.path.splitext(f)[0]
    return '%s.%04i.%s' % (f, chunk_index, filetype)


def export_wav(sound):
    f = tempfile.NamedTemporaryFile(delete=False, suffix='.wav')
    # print("Export wav file duration: %d sec" % sound.duration_seconds)
    s = sound.export(f.name, format="wav")
    s.close()
    return f.name

def export_mp3(sound):
    f = tempfile.NamedTemporaryFile(delete=False, suffix='.mp3')
    # print("Export mp3 file duration: %d sec" % sound.duration_seconds)
    s = sound.export(f.name, format="mp3")
    s.close()
    return f.name
