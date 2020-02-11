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

import { TileDefinitions } from './TileDefinitions'
import { Globals } from '../globals'

const URL_BASE = 'https://storage.googleapis.com/deepblue-similarities/'

export class SimilarityTileDefinitions extends TileDefinitions {
    
    getTile(time, tileZoomLevel){
        if(!Globals.currentLocation) return undefined

        let ret = super.getTile(time, tileZoomLevel)

        // Calculate filename for tile
        const date = new Date(ret.time)
        const dir = tileZoomLevel < 0 ? 'n'+(-tileZoomLevel) : tileZoomLevel
        
        ret.file = `${URL_BASE}tiles-${dir}/${
            Globals.currentLocation.name
        }/${date.getUTCFullYear()}_${this.timeDigits(
            date.getUTCMonth() + 1
        )}_${this.timeDigits(date.getUTCDate())}T${this.timeDigits(
            this.timeDigits(date.getUTCHours())
        )}_${this.timeDigits(date.getUTCMinutes())}_${this.timeDigits(
            date.getUTCSeconds()
        )}.jpg`
        
        return ret
    }    

    timeDigits(number){
        return ('0' + number).slice(-2)
    }
}
