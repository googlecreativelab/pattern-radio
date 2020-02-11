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
import os
import struct
import logging
import datetime

HarpGeoScale = 100000.0

epoch = datetime.datetime.utcfromtimestamp(0)
def unix_time_secs(dt):
    return (dt - epoch).total_seconds() * 1000

def DumpHeaderOutput(structHeaderFields):
    for key in structHeaderFields.keys():
        print("%s: " % (key), structHeaderFields[key])

def read_harp_sub_chunk(fileIn, raw_file):
    n = 32 * raw_file
    fileIn.seek(100 + n)
    bufHeader = fileIn.read(32)

    stHeaderFields = {
        # 'year' : 0, 
        # 'month' : 0,
        # 'day': 0,
        # 'hour' :0,
        # 'minute': 0,
        # 'secs': 0,
        # 'ticks': 0,
        'time': 0,
        'byte_loc': 0,
        'byte_length': 0,
        'write_length': 0,
        'sample_rate': 0,
        'gain': 0,
        # 'padding': 0,
    }
    
    year = struct.unpack('<B', bufHeader[0:1])[0]
    month = struct.unpack('<B', bufHeader[1:2])[0]
    day = struct.unpack('<B', bufHeader[2:3])[0]
    hour = struct.unpack('<B', bufHeader[3:4])[0]
    minute = struct.unpack('<B', bufHeader[4:5])[0]
    secs = struct.unpack('<B', bufHeader[5:6])[0]
    ticks = struct.unpack('<H', bufHeader[6:8])[0]  


    time = datetime.datetime( 
        2000+year, 
        month, 
        day, 
        hour, 
        minute, 
        secs, 
        ticks * 1000)

    # print(time)

    stHeaderFields['time'] = unix_time_secs(time)
    stHeaderFields['byte_loc'] = struct.unpack('<L', bufHeader[8:12])[0]
    stHeaderFields['byte_length'] = struct.unpack('<L', bufHeader[12:16])[0]
    stHeaderFields['write_length'] = struct.unpack('<L', bufHeader[16:20])[0]
    stHeaderFields['sample_rate'] = struct.unpack('<L', bufHeader[20:24])[0]
    
    stHeaderFields['gain'] = struct.unpack('<B', bufHeader[24:25])[0]
    # stHeaderFields['padding'] = struct.unpack('<B', bufHeader[24:25])[0]

    return stHeaderFields

def read_header(fileIn):
    fileIn.seek(0)

    # Read in all data
    bufHeader = fileIn.read(45)

    # Verify that the correct identifiers are present
    if (bufHeader[0:4] != b'RIFF') or (bufHeader[12:16] != b'fmt '): 
         print("Input file not a standard WAV file")
         raise Exception("Input file not a standard WAV file")
    
    stHeaderFields = {
        'ChunkSize' : 0, 
        'Format' : '',
        'Subchunk1Size' : 0, 
        'AudioFormat' : 0,
        'NumChannels' : 0, 
        'SampleRate' : 0,
        'ByteRate' : 0, 
        'BlockAlign' : 0,
        'BitsPerSample' : 0, 
        # 'Filename': '',
        
        # HARP fields
        'hSubchunkSize': 0,
        'WavVersionNumber': 0,
        'FirmwareVersionNumber': '',
        'InstrumentID':'',
        'SiteName':'',
        'ExperimentName':'',
        'DiskSequenceNumber':'',
        'DiskSerialNumber':'',
        'NumOfRawFiles':0,
        'Longitude':0,
        'Latitude':0,
        'Depth':0,

        'SubChunks': []
    }

    # Parse fields
    stHeaderFields['ChunkSize'] = struct.unpack('<L', bufHeader[4:8])[0]
    stHeaderFields['Format'] = bufHeader[8:12]
    stHeaderFields['Subchunk1Size'] = struct.unpack('<L', bufHeader[16:20])[0]
    stHeaderFields['AudioFormat'] = struct.unpack('<H', bufHeader[20:22])[0]
    stHeaderFields['NumChannels'] = struct.unpack('<H', bufHeader[22:24])[0]
    stHeaderFields['SampleRate'] = struct.unpack('<L', bufHeader[24:28])[0]
    stHeaderFields['ByteRate'] = struct.unpack('<L', bufHeader[28:32])[0]
    stHeaderFields['BlockAlign'] = struct.unpack('<H', bufHeader[32:34])[0]
    stHeaderFields['BitsPerSample'] = struct.unpack('<H', bufHeader[34:36])[0]

    
    # ftp://cetus.ucsd.edu/outbox/triton1.81-20161114-kernel/help/triton_a2.html
    #parse HARP header 
    if (bufHeader[36:40] != b'harp'): 
         print("Input file not a HARP file")
         raise Exception("Input file doesnt have HARP header")
    stHeaderFields['hSubchunkSize'] = struct.unpack('<L', bufHeader[40:44])[0]

    fileIn.seek(0)
    bufHeader = fileIn.read(45 + stHeaderFields['hSubchunkSize'])

    stHeaderFields['WavVersionNumber'] = struct.unpack('<B', bufHeader[44:45])[0]
    stHeaderFields['FirmwareVersionNumber'] = struct.unpack("%ds" % 10, bufHeader[45:55])[0]
    stHeaderFields['InstrumentID'] = struct.unpack("%ds" % 4, bufHeader[55:59])[0].decode("utf-8").rstrip()
    stHeaderFields['SiteName'] = struct.unpack("%ds" % 4, bufHeader[59:63])[0].decode("utf-8").rstrip()
    stHeaderFields['ExperimentName'] = struct.unpack("%ds" % 8, bufHeader[63:71])[0].decode("utf-8").rstrip()
    stHeaderFields['DiskSequenceNumber'] = struct.unpack("%ds" % 1, bufHeader[71:72])[0]
    stHeaderFields['DiskSerialNumber'] = struct.unpack("%ds" % 8, bufHeader[72:80])[0]

    stHeaderFields['NumOfRawFiles'] = struct.unpack("<H", bufHeader[80:82])[0]
    stHeaderFields['Longitude'] = struct.unpack("<l", bufHeader[82:86])[0] / HarpGeoScale
    stHeaderFields['Latitude'] = struct.unpack("<l", bufHeader[86:90])[0]  / HarpGeoScale
    stHeaderFields['Depth'] = struct.unpack("<H", bufHeader[90:92])[0]
    
    for i in range(stHeaderFields['NumOfRawFiles']):
        stHeaderFields['SubChunks'].append(read_harp_sub_chunk(fileIn, i))
    
    return stHeaderFields
    
def auto_fix_chunk_timing(header):
    """ Tries to solve for overlapping chunks by shifting around or cropping if needed """

    return header


if __name__ == "__main__":
    try:
        fileIn = open(sys.argv[1], 'rb')
        header = read_header(fileIn)
        DumpHeaderOutput(header)
        fileIn.close()


    except IOError:
        print("Could not open input file %s" % (sys.argv[1]))

    
    