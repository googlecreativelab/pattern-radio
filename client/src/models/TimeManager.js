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

import { Globals, Config } from '../globals'
import { GUI } from '../ui/Dat'

const removeGaps = true
// This is the global time manager
export class TimeManager {
    constructor() {
        this._time = 0

        this.gapMaxDuration = 300
        if (GUI) GUI.add(this, 'gapMaxDuration')
    }

    /**
     * Get window start time
     */
    get windowStartTime() {
        // return this.currentTime - this._duration / 2
        if (!this._lookup) return this.currentTime - this._duration / 2
        // console.log(this._lookupPxTime(0))
        return this._lookupPxTime(0)
    }

    /** Get window end time */
    get windowEndTime() {
        // return this.currentTime + this._duration / 2
        if (!this._lookup) return this.currentTime + this._duration / 2
        // console.log(this._lookupPxTime(window.innerWidth))
        return this._lookupPxTime(window.innerWidth)
    }

    /**
     * Return current time of playhead
     */
    get currentTime() {
        return this._time
    }

    setCurrentTime(time) {
        this._time = time
        this._calculateTimeLookup()
    }

    /**
     * Get window duration
     */
    get windowDuration() {
        // return this._duration
        return this.windowEndTime - this.windowStartTime
    }

    get idealWindowDuration() {
        return this._duration
    }

    static calcIdealWindowDuration(tileDuration) {
        return (tileDuration * window.innerWidth) / Config.tileWidth
    }

    setWindowDuration(duration) {
        this._duration = duration
        this._resolution = this._duration / window.innerWidth
        this._calculateTimeLookup()
    }

    /**
     * Get pixel resolation (ms / px)
     */
    get resolution() {
        return this._resolution
    }

    /**
     * Get pixel position on x axis of time relative to window start (left side)
     * @param {Number} time
     */
    timeToPx(time) {
        const lookup = this._lookupTimePx(time)
        return lookup
    }

    /**
     * Return time at pixel value
     * @param {Number} px
     */
    pxToTime(px) {
        return this._lookupPxTime(px)
    }

    /**
     * Get pixel duration between two times
     * @param {Number} timeStart
     * @param {Number} timeEnd
     */
    durationToPx(timeStart, timeEnd) {
        return this.timeToPx(timeEnd) - this.timeToPx(timeStart)
    }

    /**
     * Return duration between two pixel values
     * @param {Number} x1
     * @param {Number} x2
     */
    pxToDuration(x1, x2) {
        return Math.abs(this.pxToTime(x2) - this.pxToTime(x1))
    }

    /**
     * Return if there is a gap at time
     * @param {Number} time
     */
    gapAtTime(time) {
        const period = this._lookupTime(time)
        if (!period) return false
        return period.gap
    }

    /**
     * Get periods with gaps
     * @param {*} timeStart
     * @param {*} timeEnd
     */
    getGaps(timeStart, timeEnd) {
        return this._lookup.filter((p) => {
            return p.timeEnd > timeStart && p.timeStart < timeEnd && p.gap
        })
    }

    getGap(time) {
        const period = this._lookupTime(time)
        if (!period) return false
        return period.gap ? period : false
    }

    getAudioPeriods(timeStart, timeEnd) {
        return this._lookup.filter((p) => {
            return p.timeEnd > timeStart && p.timeStart < timeEnd && !p.gap
        })
    }

    /**
     * Returns if the window has changed in the past tick
     * Useful to determine if a view needs to be re-rendered
     */
    get updated() {
        return this._updated
    }

    tick() {
        // check if window has changed
        if (this._prevWindowStartTime != this.windowStartTime || this._prevWindowEndTime != this.windowEndTime) {
            this._updated = true
            this._prevWindowStartTime = this.windowStartTime
            this._prevWindowEndTime = this.windowEndTime

            // this._calculateTimeLookup()
        } else {
            this._updated = false
        }
    }

    /**
     * Lookup a time in lookup table, and return pixel position
     * @param {Number} time
     */
    _lookupTimePx(time) {
        if (time > this._lookupReverse[0].timeEnd) return this._lookupReverse[0].pixelPositionEnd
        if (time < this._lookup[0].timeStart) return this._lookup[0].pixelPosition

        if (!this._lookup) return
        for (let l of this._lookup) {
            if (l.timeStart <= time && l.timeEnd > time) {
                const offset = time - l.timeStart
                const p = l.pixelPosition
                return p + (offset * l.timeScale) / this.resolution
            }
        }
    }

    _lookupTime(time) {
        if (time > this._lookupReverse[0].timeEnd) return this._lookupReverse[0]
        if (time < this._lookup[0].timeStart) return this._lookup[0]

        if (!this._lookup) return
        for (let l of this._lookup) {
            if (l.timeStart <= time && l.timeEnd > time) {
                return l
            }
        }
    }

    /**
     * Lookup a pixel value in lookup table, and return time
     * @param {Number} px
     */
    _lookupPxTime(px) {
        if (!this._lookup) return
        for (let l of this._lookupReverse) {
            if (l.pixelPosition <= px) {
                const offset = px - l.pixelPosition
                const t = l.timeStart
                return t + (offset / l.timeScale) * this.resolution
            }
        }
    }

    /**
     * Return max duration at current zoom level for a gap
     */
    _gapMaxDuration() {
        return this.gapMaxDuration * this._resolution
    }

    /**
     * This function finds the next period used for the time lookup table from a time
     * @param {*} t
     * @param {*} gaps
     * @param {*} backwards
     */
    _findLookupTimePeriod(t, gaps, backwards = false) {
        let period = {
            timeScale: 1,
            gap: false,
            timeStart: t,
            timeEnd: t,
        }

        // Check if in a gap
        let gap
        if (!backwards) {
            gap = gaps.find((g) => g.time_start <= t && g.time_end > t)
        } else {
            gap = gaps.find((g) => g.time_start < t && g.time_end >= t)
        }
        if (gap) {
            const gapDuration = gap.time_end - gap.time_start
            if (removeGaps && gapDuration > this._gapMaxDuration()) {
                period.timeScale = this._gapMaxDuration() / (gap.time_end - gap.time_start)
            }

            period.timeStart = gap.time_start
            period.timeEnd = gap.time_end

            period.gap = true
        } else {
            // If not in a gap, find next gap, and progress to it, or end
            if (!backwards) {
                const nextGap = gaps.find((g) => g.time_start > t)
                if (nextGap) period.timeEnd = nextGap.time_start
                else period.timeEnd = period.timeStart + 10e10 // TODO
            } else {
                const prevGap = gaps
                    .slice(0)
                    .reverse()
                    .find((g) => g.time_end < t)
                if (prevGap) period.timeStart = prevGap.time_end
                else period.timeStart = period.timeEnd - 10e10 // TODO
            }
        }

        return period
    }

    _calculateTimeLookup() {
        if (!Globals.currentLocation) return

        let gaps = Globals.currentLocation.gaps.slice(0)
        // console.log(gaps.length)

        // Remove audio < 10 px
        for (let i = 0; i < gaps.length - 1; i++) {
            const gap1 = gaps[i]
            const gap2 = gaps[i + 1]
            if (gap2.time_start - gap1.time_end < 10 * this._resolution) {
                gaps[i].time_end = gap2.time_end
                gaps.splice(i + 1, 1)
            }
        }

        // Remove gaps < 5 px
        gaps = gaps.filter((p) => p.time_end - p.time_start > 5 * this._resolution)

        // console.log(gaps.length)
        const lookup = []
        const lookupReverse = []

        // Search forward from current time
        let timeCursor = this.currentTime
        let pixelCursor = window.innerWidth / 2
        let c = 0
        while (pixelCursor < window.innerWidth * 5) {
            let period = this._findLookupTimePeriod(timeCursor, gaps)

            const offset = period.timeStart - timeCursor
            period.pixelPosition = pixelCursor + (offset * period.timeScale) / this.resolution

            // Move time cursor
            timeCursor = period.timeEnd
            // Move pixel cursor
            pixelCursor =
                period.pixelPosition + ((period.timeEnd - period.timeStart) * period.timeScale) / this.resolution
            period.pixelPositionEnd = pixelCursor

            lookup.push(period)
            lookupReverse.unshift(period)

            // Just to be safe...
            if (c++ > 100) {
                console.error('C > 100')
                break
            }
        }

        // Search backwards from the first period
        timeCursor = lookup[0].timeStart
        pixelCursor = lookup[0].pixelPosition
        c = 0
        while (pixelCursor > -window.innerWidth * 4) {
            let period = this._findLookupTimePeriod(timeCursor, gaps, true)

            period.pixelPositionEnd = pixelCursor

            // Move time cursor
            timeCursor = period.timeStart
            // Move pixel cursor
            pixelCursor -= ((period.timeEnd - period.timeStart) * period.timeScale) / this.resolution
            period.pixelPosition = pixelCursor

            lookup.unshift(period)
            lookupReverse.push(period)

            // Just to be safe...
            if (c++ > 100) {
                console.error('C reverse > 100')
                break
            }
        }

        this._lookup = lookup
        this._lookupReverse = lookupReverse

        this._lookupMinTime = lookup[0].timeStart
    }
}
