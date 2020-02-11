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

import { fetchLocations, fetchRange, fetchGaps } from '../network/LocationsNetwork'
import { Location } from '../models/Location'

let instance

class Locations {
    constructor() {
        if (instance) {
            return instance
        }
        this.locations = {}
        instance = this
    }

    async get(locationName) {
        // const locationsData = await this.getLocations()
        
        // const locationData = locationsData.find((d)=> d['location'] == locationName)
        // if(!locationData){
        //     console.error(`Location ${locationName} does not exist`)
        //     return null
        // }
        const range = await fetchRange(locationName)
        const locationData = {
            location: locationName,
            range,
            gaps: await fetchGaps(locationName, range.min_time, range.max_time)
        }
        
        return new Location(
            locationData,
        )        
    }

    async getLocations() {
        if (!this._locationsData) {
            this._locationsData = await fetchLocations()
        }
        return this._locationsData
    }

    async getDefaultLocation() {}
}

export const LocationsModel = new Locations()
