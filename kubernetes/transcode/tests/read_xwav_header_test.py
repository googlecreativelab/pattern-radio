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

import unittest
from transcode.src import read_xwav_header

class TestReadHeader(unittest.TestCase):
    def setUp(self):
        pass

    def test(self):
        fileIn = open('transcode/tests/audio/test.x.wav', 'rb')
        header = read_xwav_header.read_header(fileIn)
        self.assertEqual(header['SampleRate'], 10000)
        self.assertEqual(header['Latitude'], 18.72238)
        self.assertEqual(header['Longitude'], -158.25368)
        self.assertEqual(header['Depth'], 396)
        self.assertEqual(header['ExperimentName'], 'Cross_02')
        self.assertEqual(header['InstrumentID'], 'DL13')
        self.assertEqual(header['NumOfRawFiles'], len(header['SubChunks']))
        self.assertEqual(header['SubChunks'][0]['sample_rate'], 10000)
        self.assertEqual(header['SubChunks'][0]['byte_loc'], 1068)
        self.assertEqual(header['SubChunks'][0]['byte_length'], 1500000)
        self.assertEqual(header['SubChunks'][0]['time'], 1144232443000)
        self.assertEqual(header['SubChunks'][1]['time'], 1144232518000)
        read_xwav_header.DumpHeaderOutput(header)
        fileIn.close()
    
    def test2(self):
        fileIn = open('transcode/tests/audio/wrong_order.wav', 'rb')
        header = read_xwav_header.read_header(fileIn)
        self.assertEqual(header['SampleRate'], 10000)
        self.assertEqual(header['Latitude'], 19.5815)
        self.assertEqual(header['Longitude'], -156.0152)
        self.assertEqual(header['Depth'], 630)
        self.assertEqual(len(header['SubChunks']), 4)
        self.assertEqual(header['SubChunks'][0]['time'], 1223806581920)
        read_xwav_header.DumpHeaderOutput(header)
        fileIn.close()

    


if __name__ == '__main__':
    unittest.main()