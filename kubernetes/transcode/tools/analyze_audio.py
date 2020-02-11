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

import sys
import datetime
from src import read_xwav_header

def t(time):
    return (datetime.datetime.fromtimestamp(time/1000))


fileIn = open(sys.argv[1], 'rb')
header = read_xwav_header.read_header(fileIn)
header = read_xwav_header.auto_fix_chunk_timing(header)
# read_xwav_header.DumpHeaderOutput(header)
fileIn.close()

prev_end_time = None

agg_duration = 0
max_duration = 0
agg_count = 0
agg_start_time = None

gap_total = 0
overlap_total = 0
num_chunks = 0
# print(header)
byte_offset = header['SubChunks'][0]['byte_loc']
for e in header['SubChunks']:
    start_time = e['time']
    duration = 1000 * e['byte_length'] / e['sample_rate'] / (header['BitsPerSample'] / 8)
    pos = 1000 * (e['byte_loc']-byte_offset) / e['sample_rate'] / (header['BitsPerSample'] / 8)
    # print(pos/1000)
    end_time = start_time + duration 

    if prev_end_time:
        if start_time == prev_end_time:
            pass
        else:
            print("- %s - %s (%i sec long, %i chunks) ends on %i sec" % (t(agg_start_time), t(prev_end_time), agg_duration/1000, agg_count, (pos/1000)))
            assert (prev_end_time - agg_start_time) == agg_duration
            
            if start_time < prev_end_time:
                overlap_total += (prev_end_time - start_time)
                print("!!! Next audio starts %i sec too early" % ((prev_end_time - start_time) / 1000))

            if start_time > prev_end_time:
                gap_total += (prev_end_time - start_time)
                print("gap (%i sec)" % (-(prev_end_time - start_time) / 1000 ))
            # else: 
                
            agg_duration = 0
            agg_count = 0
            agg_start_time = start_time
            num_chunks += 1
    else:
        agg_start_time = start_time

    agg_count += 1
    agg_duration += duration
    max_duration = max(max_duration, agg_duration)
    prev_end_time = end_time
    # print(duration/1000)

print("- %s - %s (%i sec long, %i chunks)" % (t(agg_start_time), t(prev_end_time), agg_duration/1000, agg_count))
print("")
print("-----")
print("")

    # print(t(start_time), t(end_time))
print("Max chunk duration: ", max_duration/1000)
print("Num continuous chunks: ", num_chunks + 1)
print("Gap total: ", -gap_total/1000)
print("Overlap total: ", overlap_total/1000)
print("Start timecode: ", t(header['SubChunks'][0]['time']))
print("End timecode: ", t(prev_end_time))

print("")
print("")

