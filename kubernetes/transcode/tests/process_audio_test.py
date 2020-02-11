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
from transcode.src import process_audio
from transcode.src import read_xwav_header
from pydub import AudioSegment
import os

class TestReadHeader(unittest.TestCase):
    def setUp(self):
        pass        


    def testProcess(self):
        generator = process_audio.process_and_split_audiofile(
            'transcode/tests/audio/Palmyra5_stWT_080829_154230.d20.x.wav', 
            60)

        res = []
        for r in generator:
            res.append(r)
            
        r = res[0]
        self.assertEqual(r['audio'].duration_seconds, 75)
        self.assertEqual(r['time_start_original'], 1220024550000.0)
        self.assertEqual(r['time_start'], 1220024550000.0)
        self.assertEqual(r['time_end'], 1220024550000.0 + 75000)
        self.assertEqual(r['chunk_index_start'], 0)
        self.assertEqual(r['chunk_index_end'], 0)
        self.assertEqual(r['duration'], 75)
        self.assertIsNotNone(r['header'])

        r = res[1]
        self.assertEqual(r['time_start'], 1220024625000.0)
        self.assertEqual(r['audio'].duration_seconds, 75)
        self.assertEqual(r['chunk_index_start'], 1)

        r = res[2]
        self.assertEqual(r['time_start'], 1220025600000.0)
        self.assertEqual(r['audio'].duration_seconds, 75)
        self.assertEqual(r['chunk_index_start'], 2)

        r = res[3]
        self.assertEqual(r['time_start'], 1220025675000.0)
        self.assertEqual(r['audio'].duration_seconds, 75)
        self.assertEqual(r['chunk_index_start'], 3)
        self.assertEqual(r['time_offset'], 0)


    def testProcessLongerMaxDuration(self):
        generator = process_audio.process_and_split_audiofile(
            'transcode/tests/audio/Palmyra5_stWT_080829_154230.d20.x.wav', 
            200)

        res = []
        for r in generator:
            res.append(r)
            
        r = res[0]
        self.assertEqual(r['audio'].duration_seconds, 150)
        self.assertEqual(r['time_start'], 1220024550000.0) 
        self.assertEqual(r['chunk_index_start'], 0) 
        self.assertEqual(r['chunk_index_end'], 1) 
        self.assertIsNotNone(r['header'])

        r = res[1]
        self.assertEqual(r['audio'].duration_seconds, 150)
        self.assertEqual(r['chunk_index_start'], 2) 

        r = res[2]
        self.assertEqual(r['audio'].duration_seconds, 150)
        self.assertEqual(r['chunk_index_start'], 4) 

        r = res[3]
        self.assertEqual(r['audio'].duration_seconds, 75)


    def testProcessMaxDuration(self):
        generator = process_audio.process_and_split_audiofile(
            'transcode/tests/audio/Palmyra5_stWT_080829_154230.d20.x.wav', 
            20000)

        res = []
        for r in generator:
            res.append(r)
            
        r = res[0]
        self.assertEqual(r['audio'].duration_seconds, 150)
        self.assertEqual(r['time_start'], 1220024550000.0) 
        self.assertIsNotNone(r['header'])

        r = res[1]
        self.assertEqual(r['audio'].duration_seconds, 300)

        r = res[2]
        self.assertEqual(r['audio'].duration_seconds, 75)

        
    # def testWeirdHeaderTimecode(self):        
        with self.assertRaises(Exception):
            g = process_audio.process_and_split_audiofile(
                'transcode/tests/audio/wrong_timecode_header.wav', 
                60)
            g.next()
    
    def testNonLinearAudiofile(self):        
        with self.assertRaises(Exception):
            g = process_audio.process_and_split_audiofile(
                'transcode/tests/audio/wrong_order.wav', 
                60)
            g.next()

    def testGetDestinationName(self):
        fileIn = open('transcode/tests/audio/Palmyra5_stWT_080829_154230.d20.x.wav', 'rb')
        # header = read_xwav_header.read_header(fileIn)

        filename = process_audio.get_destination_name('Palmyra5_stWT_080829_154230.d20.wav', 3, 'mp3')
        self.assertEqual(filename,'Palmyra5_stWT_080829_154230.d20.0003.mp3')
        
        filename = process_audio.get_destination_name('test/Palmyra5_stWT_080829_154230.d20.wav', 300, 'wav')
        self.assertEqual(filename,'Palmyra5_stWT_080829_154230.d20.0300.wav')
        fileIn.close()

    # def testExport(self):
    #     generator = process_audio.process_and_split_audiofile(
    #         'transcode/tests/audio/Palmyra5_stWT_080829_154230.d20.x.wav', 
    #         60)

    #     if os.path.exists('/tmp/export.wav'):
    #         os.remove('/tmp/export.wav')

    #     for r in generator:
    #         path = process_audio.export_wav(r['audio'])
    #         self.assertTrue(os.path.exists(path))
    #         sound1 = AudioSegment.from_file(path, format="wav")
    #         self.assertEqual(sound1.duration_seconds, 75)

    #         path = process_audio.export_mp3(r['audio'])
    #         self.assertTrue(os.path.exists(path))
    #         sound2 = AudioSegment.from_file(path, format="mp3")
    #         self.assertEqual(sound2.duration_seconds, 75)


    def testReadSubchunks(self):
        chunks = process_audio.read_subchunks('transcode/tests/audio/Palmyra5_stWT_080829_154230.d20.x.wav')
        print(chunks)
        self.assertEqual(len(chunks), 7)
        
        self.assertEqual(chunks[0]['time_start'], 1220024550000.0)
        self.assertEqual(chunks[0]['time_end'], chunks[1]['time_start'])
        self.assertEqual(chunks[0]['chunk_index'], 0)
        self.assertEqual(chunks[0]['duration'], 75)
        
    # def testOffset(self):
    #     fileIn = open('/Hawaii19K_DL10_150223_024718.df20.x.wav', 'rb')
    #     header = read_xwav_header.read_header(fileIn)
    #     offsets = process_audio.calculate_offsets(header)
    #     print(offsets)
    
    
    # def testFullFile(self):
    #     subchunks = process_audio.read_subchunks('/Hawaii19K_DL10_150223_024718.df20.x.wav')

    #     t = subchunks[0]['time_start']
    #     for chunk in subchunks:
    #         if t != chunk['time_start']:
    #             raise Exception("%i: wrong time %f != %f offset %f" % (chunk['chunk_index'], t,chunk['time_start'], chunk['time_offset'] ) )
            
    #         t = chunk['time_end']
if __name__ == '__main__':
    unittest.main()