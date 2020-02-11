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

import { GUI } from '../ui/Dat'
import Tone, { Filter, Gain, Compressor } from 'tone'
export const noiseCanceller = new Gain(2)

const config = {
    cancelNoise: false,
}
export const AudioNoiseCancellingConfig = config

let audioFolder
if (GUI) {
    audioFolder = GUI.addFolder('audio')

    //the gain node which sets the master volume.
    // seems like a value between 2-8 works reasonably well
    audioFolder.add(noiseCanceller.gain, 'value', 2, 8).name('volume')
}

const lowpassFilter = new Filter({
    type: 'lowpass',
    frequency: 1800,
    Q: 0.7,
    rolloff: -12,
})
const highpassFilter = new Filter({
    type: 'highpass',
    frequency: 200,
    Q: 0.7,
    rolloff: -12,
})

const compressor = new Compressor({
    threshold: -32,
    ratio: 6,
    attack: 0.1,
    release: 0.4,
})
Tone.connectSeries(noiseCanceller, lowpassFilter, highpassFilter, compressor, Tone.Master)

if (GUI) {
    audioFolder.add(compressor.threshold, 'value', -70, 0).name('comp thresh')
    audioFolder.add(compressor.ratio, 'value', 1, 8).name('comp ratio')
    audioFolder.add(highpassFilter.frequency, 'value', 100, 300).name('highpass')
    audioFolder.add(lowpassFilter.frequency, 'value', 1000, 3000).name('lowpass')
}
// audioFolder.add(compressor.ratio, 'value', 0, 0).name('comp thresh')
/**
 * Turn the audio noise cancelling on and off
 */
export function setNoiseCancelling() {
    throw new Error('noise cancelling feature has been removed, please update the settings')
}

export function setGain(value) {
    //scale 0-1 into the range of 2-8
    noiseCanceller.gain.value = value * 8
}
