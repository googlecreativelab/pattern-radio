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

/**
 * A tile containing classification data for a specific time range
 */

import { Globals } from '../globals'
import { TileDefinitions } from './TileDefinitions'

export class ClassificationDataTile {
    constructor(startTime, endTime, zoomLevel) {
        this.startTime = startTime
        this.endTime = endTime
        this.zoomLevel = zoomLevel
        this.loaded = false
    }

    async fetch() {
        ClassificationDataTile.fetchCount++
        const data = await Globals.currentLocation.getClassifications(
            this.startTime,
            this.endTime,
            this.zoomLevel,
            true
        )

        ClassificationDataTile.fetchCount--

        this.loaded = true
        let barWidth = TileDefinitions.zoomLevelDuration(this.zoomLevel)

        this.data = data.map((d) => {
            return {
                time_start: d[0],
                time_end: d[0] + barWidth,
                score: d[1],
            }
        })

        for (let i = 0; i < this.data.length; i++) {
            this.data[i].index = i
            this.data[i].duration = this.data[i].time_end - this.data[i].time_start
            this.data[i].zoomLevel = this.zoomLevel
        }
    }
}
ClassificationDataTile.fetchCount = 0
