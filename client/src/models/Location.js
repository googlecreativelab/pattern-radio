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

import { fetchClassifications } from '../network/ClassificationsNetwork'
import { getFiles } from '../network/Files'

const trackLen = 43750

export class Location {
    constructor(data) {
        this.latitude = data.latitude
        this.longitude = data.longitude
        this.startTime = data.range.min_time
        this.endTime = data.range.max_time
        this.duration = data.range.duration
        this.depth = data.depth
        this.name = data.location
        this.experiment_name = data.experiment_name
        this.gaps = data.gaps
        this.files = []
        this.noFilesAtTime = null
    }

    async getClassifications(startTime, endTime, zoom, compressed=false) {
        return fetchClassifications(
            this.name,
            startTime,
            endTime,
            zoom,
            compressed
        )
    }

    /**
     * Gets the audio file for the timecode,
     * as well as the next file.
     *
     * @param {number} timestamp - time in ms
     *
     * @return {array} - files
     *
     */
    async getFiles(timestamp) {
        let haveFile = false
        let haveNext = false
        const time = this.roundDownToMinute(timestamp)
        // check to see if this time and next file is cached
        this.files.forEach((file) => {
            if (time >= file.time_start && time <= file.time_end) {
                haveFile = true
            }
            if (
                time + trackLen >= file.time_start &&
                time + trackLen <= file.time_end
            ) {
                haveNext = true
            }
        })

        if ((!haveFile || !haveNext) && this.timeHasAudio(time)) {
            const files = await getFiles(
                this.name,
                time - 60000,
                60000 * 2
            )

            // catch if there are no files for the given time
            // so that we can prevent from requesting again
            if (!files.length) {
                this.noFilesAtTime = time
            }

            files.forEach((item) => {
                const overlappingClassifications = this.files.filter((c) => {
                    return c.time_start === item.time_start
                })
                if (overlappingClassifications.length === 0) {
                    this.files.push(item)
                }
            })
        }
        this.files.sort((a, b) => {
            return a.time_start - b.time_start
        })

        return this.files.filter((item) => {
            return (
                item.time_start >= time - trackLen &&
                item.time_start <= time - trackLen + trackLen * 3
            )
        })
    }

    roundDownToMinute(timestamp) {
        const date = new Date(timestamp)
        const p = 60 * 1000 // milliseconds in a minute
        return Math.floor(date.getTime() / p ) * p
    }

    merge(ranges) {
        const result = []
        let last
        ranges.sort(function(a, b) {
            return a.startTime - b.startTime || a.endTime - b.endTime
        })
        ranges.forEach(function(r) {
            if (!last || r.startTime > last.endTime) result.push((last = r))
            else if (r.endTime > last.endTime) last.endTime = r.endTime
        })
        return result
    }

    checkIfRangeLoaded(rangeGroup, startTime, duration) {
        const endTime = startTime + duration
        const ranges = rangeGroup.filter((item) => {
            return startTime >= item.startTime && endTime <= item.endTime
        })
        const inGroup = ranges.length > 0
        if (!inGroup) {
            rangeGroup.push({
                startTime: startTime,
                endTime: startTime + duration,
            })
            rangeGroup = this.merge(rangeGroup)
        }
        return inGroup
    }

    timeInGap(time){
        if(!this.gaps) return false
        const gap = this.gaps.find((g)=> g.time_start <= time && g.time_end > time)
        return gap ? gap : false
    }

    timerangeInGap(time_start, time_end){
        if(!this.gaps) return false
        const gap = this.gaps.find((g)=> g.time_start <= time_start && g.time_end > time_end)
        return gap ? gap : false
    }

    timeHasAudio(time) {
        return (
            this.noFilesAtTime === null ||
            (
                time < this.noFilesAtTime - trackLen ||
                time > this.noFilesAtTime + trackLen * 2
            ) && ! this.timeInGap(time)
        )
    }
}
