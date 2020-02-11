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

import os
import numpy
import PIL
from PIL import Image
import sys
import os

DEST_DIR = 'images'

def average_file(file_name):
	# remove the tmp dir
	# os.system('rm -rf ./%s' % DEST_DIR)
	os.system('mkdir %s' % DEST_DIR)

	os.system('gsutil -m cp -r gs://deepblue-spectrograms/%s*.png ./%s' % (file_name, DEST_DIR))

	# Access all PNG files in directory
	allfiles = os.listdir(os.getcwd() + '/' + DEST_DIR)
	imlist = [filename for filename in allfiles if filename[-4:] in [".png", ".PNG"]]

	# Assuming all images are the same size, get dimensions of first image
	w, h = Image.open('./' + DEST_DIR + '/' + imlist[0]).size
	N = len(imlist)

	# Create a numpy array of floats to store the average (assume RGB images)
	arr = numpy.zeros((h, w), numpy.float)

	count=0
	# Build up average pixel intensities, casting each image as an array of floats
	for im in imlist:
		try:
			imarr = numpy.array(Image.open('./' + DEST_DIR + '/'+im), dtype=numpy.float)
			if (arr.shape == imarr.shape):
				count += 1
				sys.stdout.write("\r%i / %i" % (count, N))
				sys.stdout.flush()
				arr = arr+imarr/N
		except Exception as e:
			pass

	# Round values in array and cast as 8-bit integer
	arr = numpy.array(numpy.round(arr), dtype=numpy.uint8)

	print('\nwriting images...\n')

	count=0
	# denoise images
	for im in imlist:
		try:
			imarr = numpy.array(Image.open('./' + DEST_DIR + '/'+im), dtype=numpy.float)
			count += 1
			sys.stdout.write("\r%i / %i" % (count, N))
			sys.stdout.flush()
			imarr = imarr - arr
			out = Image.fromarray(imarr)
			out.convert('L').save('./' + DEST_DIR + '/' + im[:-4] + '_denoise.png')
		except Exception as e:
			pass
	
	# upload them back to the cloud from whence they came
	os.system('gsutil -m cp -r ./%s/*_denoise.png gs://deepblue-spectrograms-denoise' % DEST_DIR)

	# Generate, save and preview final image
	# out = Image.fromarray(arr)
	# out.save("average.png")


# average_file('Hawaii19K_DL10_141202_011500.df20.x')
average_file('Hawaii19K_DL10_150224_045115.df20.x')
