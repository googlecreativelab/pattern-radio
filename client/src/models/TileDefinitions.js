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

const hour = 3.6e6
const log2 = Math.log(2) 
export class TileDefinitions {
    constructor(){}

    /**
     * @param startTime - timestamp in ms
     * @param endTime - timestamp in ms
     * @param zoomLevel - 1 (min) is 1hr, 32 (max) is 112.5 seconds
     * @param incr - tile duration in ms
     *
     * @return of tiles for the set location
     * in a given timeframe.
     *
     */
    getRange(startTime, endTime, zoomLevel){
        const incr = TileDefinitions.zoomLevelDuration(zoomLevel)
        const t = this.getClosestTileStartTime(startTime, incr)
        const tiles = []
        for (let i = t; i < endTime; i+=incr){
            tiles.push(this.getTile(i, zoomLevel))
        }
        return tiles
    }

    getTile(time, tileZoomLevel){
        const incr = TileDefinitions.zoomLevelDuration(tileZoomLevel)
        return { 
            tileZoomLevel, 
            time, 
            duration : incr,             
        }
    }

    getClosestTileStartTime(time, incr){
        return (
            time - (time % incr)
        )
    }

    static zoomLevelDuration(zoomLevel){
        return hour / Math.pow(2, zoomLevel)
    }

    static getZoomLevel(duration){
        return Math.log(hour / duration) / log2
    }
}