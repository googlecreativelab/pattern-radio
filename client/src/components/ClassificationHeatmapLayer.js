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

import { Container, Graphics, utils } from 'pixi.js'
import { Globals, Device } from '../globals'
import { interpolateMultiColor, clamp } from '../util/Math'
import { GUI } from '../ui/Dat'
import { ClassificationDataTile } from '../models/ClassificationDataTile'
import { TileDefinitions } from '../models/TileDefinitions'
import { Tween, Easing } from '@tweenjs/tween.js'
const idealBarWidth = 10
const minTileZoom = -4
const maxTileZoom = 9
export class ClassificationHeatmapLayer extends Container {
    constructor(infoBubble) {
        super()

        this.infoBubble = infoBubble
        this.classifData = []
        this.graphics = new Graphics()
        this.addChild(this.graphics)
        this._colorStart = [31, 31, 53]
        this._colorMid = [143, 0, 50]
        this._colorEnd = [255, 0, 0]

        this._updateColorMap()
        this._windowStart = 0
        this._windowEnd = 0
        this.needsRender = false

        if (GUI) {
            GUI.addColor(this, 'colorStart')
            GUI.addColor(this, 'colorMid')
            GUI.addColor(this, 'colorEnd')
        }

        this.tileDefinitions = new TileDefinitions()
        this.dataTiles = {}

        this.loaded = false

        // Setup mouse interaction with tooltip (infobubble)
        this.interactive = true
        this.on('pointerdown', () => {})
        this.on('mouseover', (e) => {
            this.mouseOver(e)
        })
        this.on('mouseout', () => {
            this.mouseOut()
        })
        this.on('mousemove', (e) => {
            this.mouseMove(e)
        })

        this._heatmapTransition = 1
        this.tween = new Tween(this)
        this.tween.easing(Easing.Quadratic.InOut).onUpdate(() => {
            this.needsRender = true
        })
    }

    mouseOver() {
        if (!Device.isTouch) this.hover = true
    }
    mouseMove(e) {
        if (this.hover) {
            const score = this.getClassifsForPosition(e.data.global.x)
            if (score !== null) {
                this.infoBubble.coords = {
                    x: e.data.global.x + 10,
                    y: e.data.global.y + 10,
                }
                this.infoBubble.text = `Humpback whale detection confidence: ${Math.floor(score * 100)}%`
            } else {
                this.infoBubble.open = false
            }
        }
    }

    mouseOut() {
        this.hover = false
        this.infoBubble.open = false
    }

    _updateColorMap() {
        this.colormap = interpolateMultiColor([this._colorStart, this._colorMid, this._colorEnd])
    }
    set colorStart(c) {
        this._colorStart = c.map((x) => Math.round(x))
        this._updateColorMap()
    }
    set colorMid(c) {
        this._colorMid = c.map((x) => Math.round(x))
        this._updateColorMap()
    }
    set colorEnd(c) {
        this._colorEnd = c.map((x) => Math.round(x))
        this._updateColorMap()
    }
    get colorStart() {
        return this._colorStart
    }
    get colorMid() {
        return this._colorMid
    }
    get colorEnd() {
        return this._colorEnd
    }

    get windowStart() {
        return Globals.timeManager.windowStartTime
    }
    get windowEnd() {
        return Globals.timeManager.windowEndTime
    }

    // Hide the heatmap with transition
    hide() {
        if (!this.hidden) {
            this.hidden = true
            this.tween
                .stop()
                .to({ _heatmapTransition: 0 }, 100)
                .start()
        }
    }

    // Show the heatmap with transition
    show() {
        if (this.hidden) {
            this.hidden = false
            this.tween
                .stop()
                .to({ _heatmapTransition: 1 }, 100)
                .start()
        }
    }

    isVisible() {
        return this._heatmapTransition > 0
    }

    isFullyVisible() {
        return this._heatmapTransition == 1
    }

    getClosestTileTime(time, incr) {
        return time - (time % incr)
    }

    getRange(startTime, endTime, zoomLevel) {
        const zoomOutFactor = 12
        const gaps = Globals.timeManager.getGaps(startTime, endTime)
        let range = this.tileDefinitions.getRange(startTime, endTime, zoomLevel - zoomOutFactor)
        return range.filter((r) => {
            return !gaps.find((g) => g.timeStart <= r.time && g.timeEnd >= r.time + r.duration)
        })
    }

    closestZoomLevel(ms) {
        return clamp(Math.round(TileDefinitions.getZoomLevel(ms)), minTileZoom, maxTileZoom)
    }

    getTile(startTime, zoomLevel) {
        if (!this.dataTiles[zoomLevel]) {
            this.dataTiles[zoomLevel] = {}
        }

        return this.dataTiles[zoomLevel][startTime]
    }

    searchLowerClassif(startTime, endTime, zoomLevelStart) {
        for (let i = zoomLevelStart - 1; i >= minTileZoom; i--) {
            const timeranges = this.getRange(startTime, endTime, i)

            if (this.getTile(timeranges[0].time, i) && this.getTile(timeranges[0].time, i).loaded) {
                const tile = this.getTile(timeranges[0].time, i)
                return tile
            }
        }
    }
    searchHigherClassif(startTime, endTime, zoomLevelStart) {
        for (let i = zoomLevelStart + 1; i <= maxTileZoom; i++) {
            const timeranges = this.getRange(
                // const timeranges = this.getTimeRanges(
                startTime,
                endTime,
                i
            )

            let tiles = []
            for (let r of timeranges) {
                if (this.getTile(r.time, i) && this.getTile(r.time, i).loaded) {
                    const tile = this.getTile(r.time, i)
                    tiles.push(tile)
                }
            }
            if (tiles.length > 0) return tiles
        }
    }

    getClassifsForCurrentWindow() {
        if (!this.windowStart) {
            return
        }
        const zoomLevel = this.closestZoomLevel(this.resolution * idealBarWidth)

        const loadStartTime = this.windowStart - this.duration * 2
        const loadEndTime = this.windowEnd + this.duration * 2

        const audioPeriods = Globals.timeManager.getAudioPeriods(loadStartTime, loadEndTime)
        // Calculate visible time ranges

        let tileDefinitions = []
        for (let period of audioPeriods) {
            let t = this.getRange(
                Math.max(loadStartTime, period.timeStart),
                Math.min(loadEndTime, period.timeEnd),
                zoomLevel
            )
            tileDefinitions = tileDefinitions.concat(t)
        }

        let data = []

        // Check if timerange tiles are loaded, if not load them
        for (const def of tileDefinitions) {
            if (!this.getTile(def.time, zoomLevel) && ClassificationDataTile.fetchCount == 0) {
                // Load new data tile
                this.dataTiles[zoomLevel][def.time] = new ClassificationDataTile(
                    def.time,
                    def.time + def.duration,
                    zoomLevel
                )
                this.dataTiles[zoomLevel][def.time].fetch().then(() => {
                    // Force an update when tile has loaded
                    this.needsRender = true
                    this.loaded = true
                })
            }

            const tile = this.getTile(def.time, zoomLevel)
            if (tile && tile.loaded) {
                data = data.concat(tile.data)
            } else {
                // Search for tiles at lower zoom levels to use as backup data
                let backupTile = this.searchLowerClassif(def.time, def.time + def.duration, zoomLevel)
                if (backupTile && backupTile.data) {
                    let d = backupTile.data.filter(
                        (d) => d.time_start < def.time + def.duration && d.time_end > def.time
                    )
                    data = data.concat(d)
                } else {
                    let higherBackupTiles = this.searchHigherClassif(def.time, def.time + def.duration, zoomLevel)
                    if (higherBackupTiles) {
                        for (let t of higherBackupTiles) {
                            let d = []
                            // Create new mocked up tile
                            let skip = (t.zoomLevel - zoomLevel) * 2
                            for (let i = 0; i <= t.data.length - skip; i += skip) {
                                let score = 0
                                for (let ii = 0; ii < skip; ii++) {
                                    score += t.data[ii + i].score
                                }
                                score /= skip
                                d.push({
                                    score: score,
                                    time_start: t.data[i].time_start,
                                    time_end: t.data[i + skip - 1].time_end,
                                    zoomLevel: zoomLevel,
                                })
                            }
                            data = data.concat(d)
                        }
                    }
                }
            }
        }
        if (data.length > 0) {
            this.classifData = data
        }
    }

    getAverageClassification() {
        if (this.classifData && this.classifData.length) {
            const total = this.classifData.reduce((total, current) => total + current.score, 0)
            return total / this.classifData.length
        } else {
            return 0
        }
    }

    get duration() {
        return Globals.timeManager.idealWindowDuration
    }

    get resolution() {
        return Globals.timeManager.resolution
    }

    update() {
        this.getClassifsForCurrentWindow()

        if (Globals.timeManager.updated || Globals.windowResizing || Globals.spectrogram.dirty) {
            this.needsRender = true
        }
        this.render()
    }

    getClassifsForPosition(px) {
        let currentClassif = this.classifData.find((item) => {
            const itemStartTimePx = Globals.timeManager.timeToPx(item.time_start)
            const itemEndTimePx = Globals.timeManager.timeToPx(item.time_end)
            return itemStartTimePx <= px && itemEndTimePx >= px
        })
        if (currentClassif) {
            return clamp(currentClassif.score, 0, 1)
        } else {
            return null
        }
    }

    render() {
        // console.log(Globals.spectrogram.windowDuration, Globals.timeManager.windowDuration, new Date(Globals.timeManager.currentTime))

        if (this.classifData.length == 0) return
        if (!this.needsRender) {
            return
        }
        this.needsRender = false
        const idealDuration = this.resolution * idealBarWidth
        const zoomLevel = this.closestZoomLevel(idealDuration)
        let fadeFactor =
            Math.abs(idealDuration - TileDefinitions.zoomLevelDuration(zoomLevel - 1)) -
            Math.abs(idealDuration - TileDefinitions.zoomLevelDuration(zoomLevel))
        fadeFactor /= TileDefinitions.zoomLevelDuration(zoomLevel)
        fadeFactor = clamp(fadeFactor, 0, 1)

        const height = this.renderHeight * this._heatmapTransition

        this.graphics.clear()

        const windowStartTime = Globals.timeManager.windowStartTime
        const windowEndTime = Globals.timeManager.windowEndTime
        this.classifData = this.classifData.filter((d) => {
            return d.time_end > windowStartTime && d.time_start < windowEndTime
        })
        for (let [index, item] of this.classifData.entries()) {
            const even = item.index % 2 == 0
            const pairIndex = even ? index + 1 : index - 1

            let intensity = item.score

            // If data is from correct zoom leve, interpolate between zoom levels
            if (
                this.classifData[pairIndex] &&
                item.zoomLevel == zoomLevel &&
                this.classifData[pairIndex].zoomLevel == zoomLevel
            ) {
                let otherIntensity = this.classifData[pairIndex].score
                intensity = intensity * fadeFactor + ((1 - fadeFactor) * (intensity + otherIntensity)) / 2
            }

            intensity = clamp(intensity, 0, 1)

            const rgb = this.colormap(intensity)
            for (let i = 0; i < rgb.length; i++) {
                rgb[i] = rgb[i] > 255 ? 255 : rgb[i]
            }
            const hex = utils.rgb2hex([rgb[0] / 255, rgb[1] / 255, rgb[2] / 255])
            this.graphics.beginFill(hex)

            let itemStartTimePx = Globals.timeManager.timeToPx(item.time_start)
            let itemEndTimePx = Globals.timeManager.timeToPx(item.time_end)
            const width = itemEndTimePx - itemStartTimePx

            if (itemEndTimePx > 0 && itemStartTimePx < window.innerWidth) {
                const yPos = (1 - this._heatmapTransition) * this.renderHeight
                this.graphics.drawRect(itemStartTimePx, yPos, width, height)
            }
            this.graphics.endFill()
        }
    }
}
