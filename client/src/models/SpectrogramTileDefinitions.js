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
import { TileDefinitions } from './TileDefinitions'

const URL_BASE = 'https://storage.googleapis.com/deepblue-tiled-spectrograms/'

const config = {
    denoise: true,
}
export const SpectrogramTileDefitionsConfig = config

if (GUI) GUI.add(config, 'denoise').name('denoised spectrogram')
export class SpectrogramTileDefinitions extends TileDefinitions {
    constructor(location, startTime) {
        super()
        this.location = location
        this.startTime = startTime
    }

    getTile(time, tileZoomLevel, base = URL_BASE) {
        let ret = super.getTile(time, tileZoomLevel)

        // Calculate filename for tile
        const date = new Date(ret.time)
        const dir = tileZoomLevel < 0 ? 'n' + -tileZoomLevel : tileZoomLevel

        let denoise = '-denoise'
        if (!config.denoise || base != URL_BASE) {
            denoise = ''
        }

        ret.file = `${base}tiles-${dir}${denoise}/${this.location}/${date.getUTCFullYear()}_${this.timeDigits(
            date.getUTCMonth() + 1
        )}_${this.timeDigits(date.getUTCDate())}T${this.timeDigits(
            this.timeDigits(date.getUTCHours())
        )}_${this.timeDigits(date.getUTCMinutes())}_${this.timeDigits(date.getUTCSeconds())}.jpg`

        // Calculate index of tile
        ret.index = (ret.time - this.startTime) / TileDefinitions.zoomLevelDuration(tileZoomLevel)

        return ret
    }

    timeDigits(number) {
        return ('0' + number).slice(-2)
    }
}
