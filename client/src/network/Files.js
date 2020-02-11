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

export async function getFiles(location, time, duration) {
    const response = await fetch(
        `${Config.apiPath}files?location=${location}` + `&time=${time}&duration=${duration}&ms_timestamps=true`
    )
    if (response.ok) {
        const files = await response.json()

        return files.map((f) => {
            return {
                filename: f.filename,
                startTime: f.time_start,
                time_start: f.time_start,
                endTime: f.time_end,
                time_end: f.time_end,
                location: f.location,
            }
        })
    } else {
        return []
    }
}
