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

import { Container, particles, Graphics, Sprite, Text, TextStyle } from 'pixi.js'
import { getControlsInfo } from '../ui/Controls'
import { scaleToRange } from '../util/Math'
import { Globals } from '../globals'
import * as d3Time from 'd3-time'
import * as d3TimeFormat from 'd3-time-format'

const defaultTextStyle = {
    fontFamily: 'Roboto Mono',
    fill: '#ffffff',
}
export const tickConfig = {
    ticks: [
        {
            // major tick
            yOffset: 32,
            textStyle: new TextStyle(Object.assign({}, defaultTextStyle, { fontSize: 15 })),
        },
        {
            // minor tick
            yOffset: 8,
            textStyle: new TextStyle(Object.assign({}, defaultTextStyle, { fontSize: 11 })),
        },
    ],
    xOffset: 3,
    stickyXOffset: 8,
    tinyTickMinSize: 3,
    tinyTickMaxSize: 6,
}
export const majorTickHeight = tickConfig.ticks[0].yOffset + tickConfig.ticks[0].textStyle.fontSize
export const minorTickHeight = tickConfig.ticks[1].yOffset + tickConfig.ticks[1].textStyle.fontSize
let tickTexture

export class Axis extends Container {
    constructor(spectrogram) {
        super()
        this.spectrogram = spectrogram
        this.interactiveChildren = false
        this.lines = new particles.ParticleContainer()
        this.addChild(this.lines)
        const lineGraphic = new Graphics()
        lineGraphic
            .lineStyle(1, 0xffffff)
            .moveTo(0, 0)
            .lineTo(0, tickConfig.ticks[0].yOffset + tickConfig.ticks[0].textStyle.fontSize)
        tickTexture = Globals.pixiApp.renderer.generateTexture(lineGraphic)
        this.tickContainers = []
        tickConfig.ticks.forEach(() => {
            this.tickContainers.push(new Container())
            this.addChild(this.tickContainers[this.tickContainers.length - 1])
        })
        this.stickyMajorTick = new Text('', tickConfig.ticks[0].textStyle) // sticky bottom left major tick
        this.tickContainers[0].addChild(this.stickyMajorTick)
        this._updateYPosition()
        this.ticks = {}
        this.lastTimeBreakIndex = 4

        // determine pixel width of largest minor tick text
        this.tickWindowPadding = 0
        const widthTestText = new Text('', tickConfig.ticks[1].textStyle)
        timeFormatBreaks.forEach((timeFormat) => {
            widthTestText.text = timeFormat.ticks[1].format(Date.now())
            timeFormat.labelWidth = widthTestText.width
            this.tickWindowPadding =
                widthTestText.width > this.tickWindowPadding ? widthTestText.width : this.tickWindowPadding
        })
        widthTestText.destroy()

        this.axisLine = new Graphics()
        this.addChild(this.axisLine)

        this.resize()
    }

    update() {
        this._computeTicks()
        this._updateYPosition()
    }

    _computeTicks() {
        if (!Globals.timeManager.updated && !Globals.spectrogram.dirty) return
        const windowDuration = Globals.timeManager.idealWindowDuration
        if (isNaN(windowDuration)) return
        let timeBreakIndex = 4 // default to minutes display
        // find which time breakpoint windowDuration falls within
        if (windowDuration > timeFormatBreaks[0].breakpoint) {
            timeBreakIndex = 0
        } else {
            for (let i = 1; i < timeFormatBreaks.length; i++) {
                if (
                    windowDuration > timeFormatBreaks[i].breakpoint &&
                    windowDuration <= timeFormatBreaks[i - 1].breakpoint
                ) {
                    timeBreakIndex = i
                    break
                }
            }
        }
        Object.keys(this.ticks).forEach((tickTime) => {
            this.ticks[tickTime].remove = true
        })
        // using found breakpoint info, render ticks
        const timeFormat = timeFormatBreaks[timeBreakIndex]
        const windowStartTimeEpoch = Globals.timeManager.windowStartTime
        // start grabbing ticks a bit before the current window so they can scroll off cleanly
        const tickWindowPadding = Globals.timeManager.pxToDuration(-this.tickWindowPadding, 0)
        const tickWindowStartTimeEpoch = windowStartTimeEpoch - tickWindowPadding
        const windowEndTimeEpoch = Globals.timeManager.windowEndTime
        const windowStartTime = new Date(windowStartTimeEpoch)
        const tickWindowStartTime = new Date(tickWindowStartTimeEpoch)
        const windowEndTime = new Date(windowEndTimeEpoch)
        const tickDates = Axis.getTickDates(timeFormat, tickWindowStartTime, windowEndTime)
        const zoomAmt = getControlsInfo().zoom
        let firstMajorTickDrawn = false
        for (let i = 0; i < tickDates.length; i++) {
            const tickTime = tickDates[i].getTime()
            const gap = Globals.timeManager.gapAtTime(tickTime)
            const nextTickTime = i < tickDates.length - 1 ? tickDates[i + 1].getTime() : windowEndTimeEpoch + 1
            // draw tick if it's onscreen
            if (tickTime < windowEndTimeEpoch && nextTickTime > tickWindowStartTimeEpoch && !gap) {
                const tickX = Globals.timeManager.timeToPx(tickTime)
                let tick = {
                    tickTexts: [],
                    remove: false,
                }
                if (!this.ticks[tickTime]) {
                    this._drawTick(tick, tickDates[i], timeFormat)
                    this.ticks[tickTime] = tick
                } else {
                    tick = this.ticks[tickTime]
                    tick.remove = false
                    // if we've hit a new breakpoint but still have a tick at this time
                    // reformat the tick based on the new breakpoint
                    if (this.lastTimeBreakIndex != timeBreakIndex) {
                        this._drawTick(tick, tickDates[i], timeFormat, true)
                    }
                }
                tick.line.x = tickX
                let isTinyTick = true
                tick.tickTexts.forEach((tickElement) => {
                    if (tickElement) {
                        tickElement.x = tickX + tickConfig.xOffset
                        isTinyTick = false
                    }
                })
                // set tiny tick line size based on zoom amount
                if (isTinyTick) {
                    tick.line.height = scaleToRange(
                        zoomAmt,
                        0,
                        1,
                        tickConfig.tinyTickMinSize,
                        tickConfig.tinyTickMaxSize
                    )
                }
                // handle special major tick details
                if (tick.tickTexts[0]) {
                    // to facilitate sticky tick transitions
                    tick.tickTexts[0].visible = tickX >= tickConfig.stickyXOffset - tickConfig.xOffset
                    // sticky bottom left major tick
                    if (!firstMajorTickDrawn) {
                        firstMajorTickDrawn = true
                        this.stickyMajorTick.text = timeFormat.ticks[0]
                            .format(
                                tickX < tickConfig.stickyXOffset - tickConfig.xOffset ? tickDates[i] : windowStartTime
                            )
                            .toUpperCase()
                        if (
                            tickX > this.stickyMajorTick.width + 2 * tickConfig.stickyXOffset ||
                            tickX < tickConfig.stickyXOffset - tickConfig.xOffset
                        ) {
                            this.stickyMajorTick.x = tickConfig.stickyXOffset
                        } else {
                            this.stickyMajorTick.x = tickX - this.stickyMajorTick.width - tickConfig.stickyXOffset
                        }
                    }
                }
            }
        }
        // if no major tick has been drawn, set the sticky tick text
        if (!firstMajorTickDrawn) {
            this.stickyMajorTick.text = timeFormat.ticks[0].format(windowStartTime).toUpperCase()
            this.stickyMajorTick.x = tickConfig.stickyXOffset
        }
        // remove ticks that are not currently in use
        Object.keys(this.ticks).forEach((tickTime) => {
            const tick = this.ticks[tickTime]
            if (tick.remove) {
                this.lines.removeChild(tick.line)
                tick.line.destroy()
                tick.tickTexts.forEach((tickElement, i) => {
                    if (tickElement) {
                        this.tickContainers[i].removeChild(tickElement)
                        tickElement.destroy()
                    }
                })
                delete this.ticks[tickTime]
            }
        })
        this.lastTimeBreakIndex = timeBreakIndex
    }

    _updateYPosition() {
        this.tickContainers.forEach((tickContainer, i) => {
            tickContainer.y = tickConfig.ticks[i].yOffset + i + 1
        })
    }

    static getTickDates(timeFormat, start, end) {
        const audioPeriods = Globals.timeManager.getAudioPeriods(start, end)

        let tickDates = []
        for (let i = 0; i < audioPeriods.length; i++) {
            const pstart = Math.max(audioPeriods[i].timeStart, start)
            const pend = Math.min(audioPeriods[i].timeEnd, end)
            const addTicks = timeFormat.timeFunc.range(pstart, pend)
            if (timeFormat.intermediateSteps) {
                if (!addTicks.length || addTicks[0] > pstart) {
                    const prevTick = timeFormat.timeFunc(pstart)
                    if (Axis.tickAddable(tickDates, prevTick)) {
                        tickDates.push(prevTick)
                    }
                }
                if (addTicks[0] > tickDates[tickDates.length - 1]) {
                    tickDates = tickDates.concat(addTicks)
                } else {
                    for (let j = 1; j < addTicks.length; j++) {
                        if (Axis.tickAddable(tickDates, addTicks[j])) {
                            tickDates.push(addTicks[j])
                        }
                    }
                }
                if (i < audioPeriods.length - 1 && (!addTicks.length || addTicks[addTicks.length - 1] < pend)) {
                    const nextTick = timeFormat.timeFunc(pend + timeFormat.interval)
                    if (Axis.tickAddable(tickDates, nextTick)) {
                        tickDates.push(nextTick)
                    }
                }
            } else {
                tickDates = tickDates.concat(addTicks)
            }
        }

        if (timeFormat.intermediateSteps) {
            // if no ticks are returned, our time interval is too big
            // for our time window and there are no interval breaks
            // within the window, so add one previous to it
            if (!tickDates.length) {
                const onlyTick = timeFormat.timeFunc(start)
                tickDates.push(onlyTick)
            }
            // if we need extra ticks extending off the left side of
            // the screen because the first tick doesn't start at 0px,
            // create a tick previous to the set
            if (tickDates[0] > start) {
                const firstTick = new Date(tickDates[0].getTime() - timeFormat.interval)
                tickDates.unshift(timeFormat.timeFunc(firstTick))
            }
            // populate intermediate ticks
            // caution: may produce inconsistent results for month or
            // year intervals due to timespan irregularities
            if (tickDates[tickDates.length - 1] < end) {
                const lastTick = new Date(tickDates[tickDates.length - 1].getTime() + timeFormat.interval)
                tickDates.push(lastTick)
            }
            const divisionInterval = timeFormat.interval / (timeFormat.intermediateSteps + 1)
            const dividedTickDates = []
            for (let i = 0; i < tickDates.length - 1; i++) {
                dividedTickDates.push(tickDates[i])
                if (tickDates[i + 1] - tickDates[i] === timeFormat.interval) {
                    for (let j = 1; j <= timeFormat.intermediateSteps; j++) {
                        const intermediateTick = new Date(tickDates[i].getTime() + divisionInterval * j)
                        dividedTickDates.push(intermediateTick)
                    }
                }
            }
            dividedTickDates.push(tickDates[tickDates.length - 1])
            return dividedTickDates
        }
        return tickDates
    }

    static tickAddable(tickDates, date) {
        return !tickDates.length || date > tickDates[tickDates.length - 1]
    }

    static dateMatchesInterval(date, interval) {
        // if the interval is a month or longer,
        // we have to use a special time function due to timespan irregularities
        if (interval === 3.154e10) {
            // one year
            return +d3Time.utcYear(date) === +date
        } else if (interval === 2.628e9) {
            // one month
            return +d3Time.utcMonth(date) === +date
        } else {
            return date.getTime() % interval === 0
        }
    }

    _addLine(height) {
        const line = new Sprite(tickTexture)
        line.height = height
        this.lines.addChild(line)
        return line
    }

    _drawTick(tick, tickDate, timeFormat, edit = false) {
        // edit is for if we've hit a new breakpoint and have to edit an existing tick
        // otherwise we're creating a new tick
        let lineDrawn = false
        timeFormat.ticks.forEach((tickFormat, tickType) => {
            if (!edit) {
                tick.tickTexts.push(null)
            }
            if (Axis.dateMatchesInterval(tickDate, tickFormat.interval)) {
                // axis line
                if (!lineDrawn) {
                    const tickHeight =
                        tickConfig.ticks[tickType].yOffset + tickConfig.ticks[tickType].textStyle.fontSize
                    if (edit) {
                        tick.line.height = tickHeight
                    } else {
                        tick.line = this._addLine(tickHeight)
                    }
                    lineDrawn = true
                }
                // tick text
                const text = tickFormat.format(tickDate).toUpperCase()
                if (edit && tick.tickTexts[tickType]) {
                    tick.tickTexts[tickType].text = text
                } else {
                    tick.tickTexts[tickType] = new Text(text, tickConfig.ticks[tickType].textStyle)
                    this.tickContainers[tickType].addChild(tick.tickTexts[tickType])
                }
            } else {
                if (edit && tick.tickTexts[tickType]) {
                    this.tickContainers[tickType].removeChild(tick.tickTexts[tickType])
                    tick.tickTexts[tickType].destroy()
                    tick.tickTexts[tickType] = null
                }
            }
        })
        // tiny ticks are drawn if nothing else has been drawn at this time spot
        if (!lineDrawn) {
            if (edit) {
                tick.line.height = tickConfig.tinyTickMaxSize
            } else {
                tick.line = this._addLine(tickConfig.tinyTickMaxSize)
            }
        }
    }

    // format timestamp to display the least granular relevant date info
    // more important to know that a new year started than a new day
    static multiFormat(date) {
        return (d3Time.utcMinute(date) < date
            ? timeFormats.secondsFormat
            : d3Time.utcDay(date) < date
            ? timeFormats.minutesFormat
            : timeFormats.monthDayFormat)(date)
    }

    resize() {
        // draw axis line
        this.axisLine
            .clear()
            .lineStyle(1, 0xffffff)
            .moveTo(0, 0)
            .lineTo(window.innerWidth + this.tickWindowPadding, 0)
        // compute breakpoints
        const padding = 15
        for (let i = 1; i < timeFormatBreaks.length; i++) {
            if (!timeFormatBreaks[i].labelWidth) continue
            timeFormatBreaks[i - 1].breakpoint =
                (window.innerWidth / (timeFormatBreaks[i].labelWidth + padding)) * timeFormatBreaks[i].ticks[1].interval
        }
    }
}

export const timeFormats = {
    yearFormat: d3TimeFormat.utcFormat('%Y'),
    monthFormat: d3TimeFormat.utcFormat('%b'),
    monthYearFormat: d3TimeFormat.utcFormat('%b %Y'),
    dayFormat: d3TimeFormat.utcFormat('%d'),
    monthDayFormat: d3TimeFormat.utcFormat('%b %d'),
    monthDayFormatNoPadding: d3TimeFormat.utcFormat('%b %-d'),
    monthDayYearFormat: d3TimeFormat.utcFormat('%b %-d %Y'),
    minutesFormat: d3TimeFormat.utcFormat('%H:%M'),
    secondsFormat: d3TimeFormat.utcFormat('%H:%M:%S'),
}

// breakpoints for different tick formats, from biggest to smallest time windows
const timeFormatBreaks = [
    {
        breakpoint: 3.924e9, // 1 month and 15 days
        timeFunc: d3Time.utcMonth,
        interval: 2.628e9,
        intermediateSteps: 5,
        ticks: [
            {
                interval: 3.154e10, // major tick label every year
                format: timeFormats.yearFormat,
            },
            {
                interval: 2.628e9, // minor tick label every month
                format: timeFormats.monthFormat,
            },
        ],
    },
    {
        breakpoint: 6.048e8, // 7 days
        timeFunc: d3Time.utcDay,
        interval: 8.64e7,
        intermediateSteps: 5,
        ticks: [
            {
                interval: 2.628e9,
                format: timeFormats.monthYearFormat,
            },
            {
                interval: 8.64e7, // minor tick label every day
                format: timeFormats.dayFormat,
            },
        ],
    },
    {
        breakpoint: 2.592e8, // 3 days
        timeFunc: d3Time.utcDay,
        interval: 8.64e7,
        intermediateSteps: 11,
        ticks: [
            {
                interval: 2.628e9,
                format: timeFormats.monthYearFormat,
            },
            {
                interval: 4.32e7, // minor tick label every 12 hours
                format: Axis.multiFormat,
            },
        ],
    },
    {
        breakpoint: 8.64e7, // 1 day
        timeFunc: d3Time.utcDay,
        interval: 8.64e7,
        intermediateSteps: 23,
        ticks: [
            {
                interval: 2.628e9,
                format: timeFormats.monthYearFormat,
            },
            {
                interval: 2.16e7, // minor tick label every 6 hours
                format: Axis.multiFormat,
            },
        ],
    },
    {
        breakpoint: 1.8e7, // 5 hour
        timeFunc: d3Time.utcHour,
        interval: 3.6e6,
        intermediateSteps: 5,
        ticks: [
            {
                interval: 8.64e7,
                format: timeFormats.monthDayYearFormat,
            },
            {
                interval: 3.6e6,
                format: timeFormats.minutesFormat,
            },
        ],
    },
    {
        breakpoint: 7.2e6, // 2 hour
        timeFunc: d3Time.utcHour,
        interval: 3.6e6,
        intermediateSteps: 11,
        ticks: [
            {
                interval: 8.64e7,
                format: timeFormats.monthDayYearFormat,
            },
            {
                interval: 1.8e6,
                format: timeFormats.minutesFormat,
            },
        ],
    },
    {
        breakpoint: 1.8e6, // half hour
        timeFunc: d3Time.utcHour,
        interval: 3.6e6,
        intermediateSteps: 59,
        ticks: [
            {
                interval: 8.64e7,
                format: timeFormats.monthDayYearFormat,
            },
            {
                interval: 300000,
                format: timeFormats.minutesFormat,
            },
        ],
    },
    {
        breakpoint: 180000, // 3 minutes
        timeFunc: d3Time.utcMinute,
        interval: 60000,
        intermediateSteps: 5, // tiny tick every 10 seconds
        ticks: [
            {
                interval: 8.64e7,
                format: timeFormats.monthDayYearFormat,
            },
            {
                interval: 60000,
                format: timeFormats.minutesFormat,
            },
        ],
    },
    {
        breakpoint: 0,
        timeFunc: d3Time.utcSecond,
        interval: 1000,
        intermediateSteps: 0, // tiny tick every second
        ticks: [
            {
                interval: 8.64e7,
                format: timeFormats.monthDayYearFormat,
            },
            {
                interval: 10000,
                format: timeFormats.secondsFormat,
            },
        ],
    },
]
