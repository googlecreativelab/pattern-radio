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

import { Container, Text, Graphics } from 'pixi.js'
import { scaleToRange } from '../util/Math'

const ticks = []

const minFreq = 70
// const maxFreq = 4000
const octaves = 5.8
const ticksPerOctave = 2
for (let i = 0; i < octaves; i += 1 / ticksPerOctave) {
    const freq = minFreq * Math.pow(2, i)
    if (freq > 1000) {
        ticks.push((freq / 1000).toFixed(1) + 'k')
    } else {
        ticks.push(freq.toFixed(0))
    }
}
ticks.reverse()

const dashWidth = 10
export const FrequenciesConfig = {
    showFrequencies: false,
}
export class Frequencies extends Container {
    constructor(spectrogram) {
        super()
        this.spectrogram = spectrogram
        this.ticks = []
        ticks.forEach((tick, index) => {
            const text = new Text(tick, { fontFamily: 'Roboto Mono', fontSize: 10, align: 'right', fill: '#FFFFFF' })
            this.addChild(text)
            text.anchor.set(1, 0)
            text.y = index * 20
            this.ticks.push(text)
            const graphics = new Graphics()
            graphics
                .lineStyle(1, 0xffffff)
                .moveTo(0, 0)
                .lineTo(dashWidth, 0)
            text.addChild(graphics)
            graphics.y = 5
            graphics.x = 6
        })
    }

    update() {
        if (this.spectrogram) {
            this.y = (window.innerHeight - this.spectrogram.height) / 2
            this.x = window.innerWidth - dashWidth
            const topPadding = 0
            if (!FrequenciesConfig.showFrequencies) {
                this.alpha = 0
                return
            } else {
                this.alpha = 1
            }
            this.ticks.forEach((tick, index) => {
                tick.alpha = this.alpha
                if (this.spectrogram.height <= 320) {
                    //hide every other
                    if (index % 2 === 0) {
                        tick.alpha = 0
                    }
                }
                tick.y = scaleToRange(index, 0, this.ticks.length, topPadding, this.spectrogram.height - topPadding)
            })
        }
    }
}
