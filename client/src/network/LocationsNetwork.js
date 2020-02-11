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

import { Config, Globals } from '../globals'

let locationsCache
export async function fetchLocations() {
    if (locationsCache) {
        return locationsCache
    }
    const response = await fetch(`${Config.apiPath}locations`)
    if (response.ok) {
        locationsCache = await response.json()
        return locationsCache
    }
}

let rangeCache = {}
export async function fetchRange(location) {
    if (rangeCache[location]) {
        return rangeCache[location]
    }
    const response = await fetch(`${Config.apiPath}range?location=${location}&ms_timestamps=true`)
    if (response.ok) {
        let range = await response.json()
        range.min_time = Math.max(range.min_time, Config.minStartTime)
        // range.max_time = Math.min(range.max_time, Config.maxEndTime)
        range.duration = range.max_time - range.min_time
        rangeCache[location] = range
        return range
    }
}

let gapCache = {}
export async function fetchGaps(location, timeStart, timeEnd) {
    const key = location + timeStart + timeEnd
    if (gapCache[key]) {
        return gapCache[key]
    }

    const response = await fetch(
        `${Config.apiPath}gaps?location=${location}&time_start=${timeStart}&time_end=${timeEnd}`
    )
    if (response.ok) {
        gapCache[key] = await response.json()
        gapCache[key] = gapCache[key].filter((d) => d.time_start < d.time_end)
        for (let period of Config.skipPeriods) {
            gapCache[key] = gapCache[key].filter((g) => g.time_end < period[0] || g.time_start > period[1])
            gapCache[key].push({
                time_start: period[0],
                time_end: period[1],
            })
        }

        gapCache[key].sort((a, b) => (a.time_start > b.time_start ? 1 : -1))
        return gapCache[key]
    }
}
