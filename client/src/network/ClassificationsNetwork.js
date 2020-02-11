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

import { Config } from '../globals'

/*
the attributes are location, time_start, time_end and zoom
zoom is an integer between -7 and 6 which represents
the power of 2 divisor of 1 hour
oneHour / pow(2, zoom)
so zoom = 0 is 1 hour and zoom -2 is 4 hours and zoom 2 is 15 minutes
*/
export async function fetchClassifications(location, timeStart, timeEnd, zoom, compressed = false) {
    let classifications
    const response = await fetch(
        `${Config.apiPath}classifications_bq` + `?location=${location}&time_start=` + `${timeStart}&time_end=${timeEnd}&zoom=${zoom}&compressed=${compressed ? 'true' : 'false'}`
    )
    if (response.ok) {
        classifications = await response.json()
        return classifications
    }
}
