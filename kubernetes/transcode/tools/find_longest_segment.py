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
# read_xwav_header.DumpHeaderOutput(header)
fileIn.close()

prev_end_time = None

agg_duration = 0
max_duration = 0

for e in header['SubChunks']:
    start_time = e['time']
    duration = 1000 * e['byte_length'] / e['sample_rate'] / (header['BitsPerSample'] / 8)
    end_time = start_time + duration 

    if prev_end_time:
        if start_time == prev_end_time:
            agg_duration += duration
        else:
            agg_duration = duration

    max_duration = max(max_duration, agg_duration)
    prev_end_time = end_time
    # print(duration/1000)


    # print(t(start_time), t(end_time))
print(max_duration/1000)
