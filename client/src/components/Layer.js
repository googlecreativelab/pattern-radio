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

import { Container } from 'pixi.js'
import { Globals, Config } from '../globals'

export class Layer extends Container {
    constructor(tileDuration, startTime, fullAudioDuration, layerIndex) {
        super()
        this.fullCoverageTime = new Date()
        this.startTime = startTime
        // Amount of time represented per tile
        this.tileDuration = tileDuration
        this.layerIndex = layerIndex
        this.fullAudioDuration = fullAudioDuration

        // Give us the pow resolution - 1,2,4,8,16,32
        this.tileZoomLevel = Math.pow(2, this.layerIndex)

        // Number of tiles in this audio track at this resolution/layer
        this.tileCount = Math.ceil(fullAudioDuration / this.tileDuration)

        // Width of all tiles in this layer.
        // Not including scale, and we might need to consider
        // the tail end, but we'll do -1 for now.
        this.layerWidth = (this.tileCount - 1) * Config.tileWidth
    }

    get timeScale() {
        if (this.tileDuration && Globals.spectrogram.duration) {
            return this.layerWidth / this.fullAudioDuration
        } else {
            return 1
        }
    }
}
