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

import { Container, Graphics, utils, BLEND_MODES } from 'pixi.js'
import { Globals, Config } from '../globals'
import { scaleToRange, clamp, interpolateMultiColor } from '../util/Math'
import IntervalTree from 'node-interval-tree'
import { SimilarityTile } from './SimilarityTile'
import { SimilarityTileDefinitions } from '../models/SimilarityTileDefinitions'
import { GUI } from '../ui/Dat'

const config = {
    color: [187, 255, 255],
    barOverlayColor: [0, 240, 233],
    blend: 'OVERLAY',
    alpha: 0.5,
    heatmapPow: 1.19,
}
export const SimilarityLayerConfig = config

let simFolder
if (GUI) {
    simFolder = GUI.addFolder('similarity')
    //
    simFolder.addColor(config, 'color')
    simFolder.addColor(config, 'barOverlayColor')
    simFolder.add(config, 'heatmapPow', 0.1, 4)
}

const MAX_DURATION = 440000

window.BLEND_MODES = BLEND_MODES

export class SimilarityLayer extends Container {
    constructor(infoBubble) {
        super()
        this.infoBubble = infoBubble
        this.similarityData = []
        this.heatmapData = []
        this.graphics = new Graphics()
        this.graphicsHeatmap = new Graphics()

        this.graphicsHeatmap.position.y = 0

        this.graphics.blendMode = BLEND_MODES.ADD
        this.addChild(this.graphics)
        this.addChild(this.graphicsHeatmap)
        // window.graphics = this.graphics
        //
        if (GUI) {
            simFolder
                .add(config, 'blend', Object.keys(BLEND_MODES))
                .name('blend mode color')
                .onChange((value) => {
                    this.graphics.blendMode = BLEND_MODES[value]
                })
            simFolder.add(config, 'alpha', 0, 1)
        }

        this._intervalTree = new IntervalTree()
        this._tileMap = new Map()

        // this.getSimilarityData = throttle(() => {
        //         this.syncWindowToSpectrogramTime()
        //         this.getSimilarityForCurrentWindow()
        // }, 500)
        this.getSimilarityData = () => {
            this.getSimilarityForCurrentWindow()
        }

        this.tileDefinitions = new SimilarityTileDefinitions()

        this.heatmap = {
            renderHeight: 0,
            position: {
                y: 0,
            },
        }

        this._heatmapStart = [31, 31, 53]
        this._heatmapEnd = [30, 30, 122]

        if (GUI) {
            simFolder.addColor(this, 'heatmapStart')
            simFolder.addColor(this, 'heatmapEnd')
        }

        this._updateHeatmapColorMap()

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
    }

    mouseOver() {
        this.hover = true
    }
    mouseMove(e) {
        if (this.hover) {
            this.infoBubble.coords = {
                x: e.data.global.x + 10,
                y: e.data.global.y + 10,
            }
            this.infoBubble.text = `At this close-up zoom level, repeated sounds are highlighted
            to help you visualize the patterns of whale songs. 
            `
        }
    }

    mouseOut() {
        this.hover = false
        this.infoBubble.open = false
    }

    async getSimilarityForCurrentWindow() {
        if (!Globals.timeManager || !Globals.spectrogram.tileDefinitions) {
            return
        }

        if (Globals.timeManager.idealWindowDuration > MAX_DURATION) {
            this.similarityData = []
            return
        }

        const audioPeriods = Globals.timeManager.getAudioPeriods(
            Globals.timeManager.windowStartTime,
            Globals.timeManager.windowEndTime
        )
        let tileData = []
        for (let period of audioPeriods) {
            let t = this.tileDefinitions.getRange(
                Math.max(Globals.timeManager.windowStartTime, period.timeStart),
                Math.min(Globals.timeManager.windowEndTime, period.timeEnd),
                4
            )
            tileData = tileData.concat(t)
        }

        const tiles = []
        tileData.forEach((desc) => {
            if (!this._tileMap.has(desc.file)) {
                const tile = new SimilarityTile(desc.file, desc.time, desc.duration)
                this._tileMap.set(desc.file, tile)
                tiles.push(tile)
            } else {
                // last touched time used for garbage collection to find old data
                const tile = this._tileMap.get(desc.file)
                tile.touched = new Date()
                tiles.push(tile)
            }
        })

        let similarityData = []
        tiles.forEach((tile) => {
            similarityData = [
                ...similarityData,
                ...tile.getSimilarity(Globals.timeManager.windowStartTime, Globals.timeManager.windowEndTime),
            ]
        })

        this.similarityData = similarityData

        this.heatmapData = []
        tiles.forEach((tile) => {
            this.heatmapData = [...this.heatmapData, ...tile.getAverage()]
        })
    }

    update() {
        this.getSimilarityData()
        this.render()
        this.cleared = false
    }

    clear() {
        if (!this.cleared) {
            this.cleared = true
            this.graphics.clear()
            this.graphicsHeatmap.clear()
        }
    }

    _updateHeatmapColorMap() {
        this.heatmapColorMap = interpolateMultiColor([this._heatmapStart, this._heatmapEnd])
    }

    set heatmapStart(c) {
        this._heatmapStart = c
        this._updateHeatmapColorMap()
    }
    set heatmapEnd(c) {
        this._heatmapEnd = c
        this._updateHeatmapColorMap()
    }
    get heatmapStart() {
        return this._heatmapStart
    }
    get heatmapEnd() {
        return this._heatmapEnd
    }

    render() {
        if (!Globals.spectrogram) {
            return
        }

        this.graphics.clear()
        this.graphicsHeatmap.clear()

        const averageWhale = Globals.spectrogram.classificationLayer.getAverageClassification()

        //scale log between 0.1 - 1
        const scaledWhale = Math.pow(averageWhale, 0.5) * 0.9 + 0.1
        const scaling = scaledWhale //scaleToRange(currentDur, MIN_DURATION, MAX_DURATION, 1, 0) * scaledWhale

        const spectrogramHeight = Globals.spectrogram.height
        const spectroOverlayColor = utils.rgb2hex(config.color.map((v) => v / 255))
        this.drawSimilarity(scaling, 0, spectrogramHeight, spectroOverlayColor, this.graphics)

        //draw the heatmap
        this.drawHeatmap(scaling)

        //draw another box over the top of the bar
        const barOverlayColor = utils.rgb2hex(config.barOverlayColor.map((v) => v / 255))
        this.drawSimilarity(
            scaling,
            this.heatmap.position.y - this.position.y - 5,
            5 + this.heatmap.renderHeight,
            barOverlayColor,
            this.graphicsHeatmap
        )
    }

    drawSimilarity(scaling, y, height, color, g) {
        if (this.similarityData.length) {
            const firstItem = this.similarityData[0]
            // const color = utils.rgb2hex(config.color.map(v => v / 255))

            const windowStartTime = Globals.timeManager.windowStartTime
            const windowEndTime = Globals.timeManager.windowEndTime

            this.similarityData.forEach((item, index) => {
                const itemStartTime = firstItem.startTime + index * firstItem.duration
                const itemEndTime = firstItem.startTime + (index + 1) * firstItem.duration

                if (itemEndTime > windowStartTime && itemStartTime < windowEndTime) {
                    const itemStartTimePx = Globals.timeManager.timeToPx(itemStartTime)
                    const itemEndTimePx = Globals.timeManager.timeToPx(itemEndTime)
                    const value = item.value

                    // const height = Globals.spectrogram.height
                    const width = itemEndTimePx - itemStartTimePx

                    const val = Math.pow(clamp(value * scaling, 0, 1), 0.8)
                    //
                    //skip values that are too small
                    if (val > 0.01) {
                        if (0 <= itemEndTimePx && itemStartTimePx <= window.innerWidth) {
                            const xVal = itemStartTimePx
                            // this.graphics.beginFill(utils.rgb2hex([0, 240/255, 233/255]), val * 0.5)
                            g.beginFill(color, val * config.alpha)
                            g.drawRect(xVal, y, width, height)
                            g.endFill()
                        }
                    }
                }
            })
        }
    }

    drawHeatmap(scaling) {
        if (this.heatmapData.length) {
            const firstItem = this.heatmapData[0]

            const windowStartTime = Globals.timeManager.windowStartTime
            const windowEndTime = Globals.timeManager.windowEndTime

            this.heatmapData.forEach((item, index) => {
                const itemStartTime = firstItem.startTime + index * firstItem.duration
                const itemEndTime = firstItem.startTime + (index + 1) * firstItem.duration

                if (itemEndTime > windowStartTime && itemStartTime < windowEndTime) {
                    const itemStartTimePx = Globals.timeManager.timeToPx(itemStartTime)
                    const itemEndTimePx = Globals.timeManager.timeToPx(itemEndTime)

                    const value = item.value

                    const width = itemEndTimePx - itemStartTimePx
                    const height = this.heatmap.renderHeight
                    const val = Math.pow(clamp(value * scaling, 0, 1), config.heatmapPow)

                    if (0 <= itemEndTimePx && itemStartTimePx <= window.innerWidth) {
                        const xVal = itemStartTimePx
                        const rgb = this.heatmapColorMap(val)
                        for (let i = 0; i < rgb.length; i++) {
                            rgb[i] = rgb[i] > 255 ? 255 : rgb[i]
                        }
                        const hex = utils.rgb2hex([rgb[0] / 255, rgb[1] / 255, rgb[2] / 255])
                        this.graphicsHeatmap.beginFill(hex)
                        this.graphicsHeatmap.drawRect(xVal, this.heatmap.position.y - this.position.y, width, height)
                        this.graphicsHeatmap.endFill()
                    }
                }
            })
        }
    }
}
