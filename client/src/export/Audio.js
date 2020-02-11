// Copyright 2019 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {getFiles} from '../network/Files'
import Tone, {Buffer} from 'tone'
import toWav from 'audiobuffer-to-wav'

/**
 * Export the audio files in a selected range
 */
export async function exportAudio(location, startTime, duration){
	const files = await getFiles(location, startTime, duration)
	const prefix = 'https://storage.googleapis.com/deepblue-transcoded-audio/'
	const audioBuffers = await Promise.all(files.map(f => Buffer.fromUrl(prefix + f.filename)))
	const sampleRate = Tone.context.sampleRate
	const outputBuffer = Tone.context.createBuffer(1, ((endTime - startTime) / 1000) * sampleRate, sampleRate)
	const outputData = outputBuffer.getChannelData(0)
	let arrayPosition = 0
	console.log(startTime - files[0].startTime)
	audioBuffers.forEach((buffer, index) => {
		const startOffset = Math.max(((startTime - files[index].startTime) / 1000) * sampleRate, 0)
		const addedSamples = buffer.getChannelData(0).length - startOffset
		outputBuffer.copyToChannel(buffer.getChannelData(0).subarray(startOffset), 0, arrayPosition)
		arrayPosition += addedSamples
	})
	const filename = `${location}_${startTime}_${endTime}`
	const wave = toWav(outputBuffer)
	const blob = new Blob([wave], { type: "audio/wav" });
	const blobUrl = window.URL.createObjectURL(blob);
	const a = document.createElement("a");
	//download all the files
	a.href = blobUrl;
	a.download = filename;
	a.click();
	window.URL.revokeObjectURL(blobUrl);
}

// exportAudio('Hawaii19', 1422753662000, 120000)