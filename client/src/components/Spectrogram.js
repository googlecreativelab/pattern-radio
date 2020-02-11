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

import { Graphics } from 'pixi.js'
import { SpectrogramTileDefinitions } from '../models/SpectrogramTileDefinitions'
import { TileImage } from '../components/TileImage'
import { clamp, logScale } from '../util/Math'
import { Axis, majorTickHeight, minorTickHeight } from './Axis'
import { Layer } from './Layer'
import { AnnotationLayer } from './AnnotationLayer'
import { TimeManager } from '../models/TimeManager'
import { LocationsModel } from '../models/Locations'
import { Globals, Config, Device } from '../globals'

import { ClassificationHeatmapLayer } from './ClassificationHeatmapLayer'
import { SimilarityLayer } from '../components/SimilarityLayer'

import { TileDefinitions } from '../models/TileDefinitions'
import { Frequencies } from './Frequencies'
import { GapLayer } from './GapLayer'

const minTileZoom = -6
const maxTileZoom = 8
const preventGarbageCollectBelow = 1

export class Spectrogram {
    constructor(container) {
        this._windowDuration = 0
        this.prevWindowDuration = 0
        this.container = container
        this.layers = []

        this.currentTiles = {}
        this._duration = 0
        this._time = Globals.controls.position + Globals.currentLocation.startTime
        this.prevTime = this.time
        this._location = null

        this.annotationLayer = new AnnotationLayer(this, Globals.controls.$$comment, Globals.controls.$$infoBubble)
        this.container.parent.addChild(this.annotationLayer)

        this.tileWindowChanging = false

        this.similarityLayer = new SimilarityLayer(Globals.controls.$$infoBubble)
        this.container.parent.addChild(this.similarityLayer)

        this.classificationLayer = new ClassificationHeatmapLayer(Globals.controls.$$infoBubble)
        window.classificationLayer = this.classificationLayer
        this.container.parent.addChild(this.classificationLayer)

        this.axis = new Axis(this)
        this.container.parent.addChild(this.axis)

        this.gapLayer = new GapLayer()
        this.container.parent.addChild(this.gapLayer)

        this.loaded = false
        this.dirty = false

        this.frequencies = new Frequencies(this)
        this.container.parent.addChild(this.frequencies)

        this.paddingBandaid = new Graphics()
        this.paddingBandaid
            .beginFill(Config.bgColor)
            .drawRect(0, 0, window.innerWidth, Config.scalePadding)
            .endFill()
        this.container.parent.addChild(this.paddingBandaid)

        this.moveToPlayhead = new Graphics()
        this.moveToPlayhead.alpha = 0.4

        this.container.parent.addChild(this.moveToPlayhead)

        this.container.interactive = true
        this.container.current = 'pointer'

        this.container.on('mouseover', (e) => {
            this.mouseHover = true
        })
        this.container.on('mouseout', (e) => {
            this.mousePlayheadPosition = 0
            this.mouseHover = false
        })
        this.container.on('mousemove', (e) => {
            if (this.mouseHover) {
                this.mousePlayheadPosition = e.data.global.x
            }
        })
    }

    async updateLocationData() {
        this.loaded = false
        this.locationModel = await LocationsModel.get(this.location)
        if (!this.tileDefinitions) {
            this.tileDefinitions = new SpectrogramTileDefinitions(this.locationModel.name, this.locationModel.startTime)
        } else {
            this.tileDefinitions.location = this.locationModel.name
            this.tileDefinitions.startTime = this.locationModel.startTime
        }

        // TODO: clear out any previous layers and tiles cache.

        if (!this.annotationLayer.annotationsData) {
            await this.annotationLayer.load()
        }
        this.annotationLayer.location = Globals.currentLocation

        for (let z = minTileZoom; z <= maxTileZoom; z++) {
            const tileDur = TileDefinitions.zoomLevelDuration(z)
            const layer = new Layer(
                tileDur,
                this.locationModel.startTime,
                this.locationModel.endTime - this.locationModel.startTime,
                z - minTileZoom
            )
            this.container.addChild(layer)
            this.layers.push(layer)
        }

        // load most zoomed-out layer
        let preloadTiles = this.tileDefinitions.getRange(
            this.locationModel.startTime,
            this.locationModel.endTime,
            minTileZoom
        )

        preloadTiles = preloadTiles.filter((tile) => {
            return !this.locationModel.timerangeInGap(tile.time, tile.time + tile.duration)
        })

        // Preload zoomed out layer
        const zoomedOutLayer = this.layers[0]
        preloadTiles.forEach((tile) => {
            if (!this.locationModel.timerangeInGap(tile.time, tile.time + tile.duration)) {
                const sprite = new TileImage(tile, zoomedOutLayer)
                this.currentTiles[tile.file] = sprite
                zoomedOutLayer.addChild(sprite)
            }
        })
    }

    get height() {
        if (Globals.fullscreen) {
            return window.innerHeight - majorTickHeight
        }
        return this.container.scale.y * Config.tileHeight
    }

    set location(location) {
        this._location = location
        this.updateLocationData()
        this.update()
    }

    get location() {
        return this._location
    }

    set duration(duration) {
        this._duration = parseFloat(duration)
        this.dirty = true
        this.update()
    }

    get duration() {
        return this._duration
    }

    set time(time) {
        // Timeline starts in the center of the window
        // this._time = parseFloat(time) - this.duration / 2
        this._time = parseFloat(time)
        if (this.prevTime !== this.time) {
            this.dirty = true
            this.prevTime = this.time
        }
        this.update()
    }

    get time() {
        return this._time
    }

    /**
     * Returns an object with the startTime and endTime
     * of the visible spectrogram in the window
     */
    get windowDuration() {
        return this._windowDuration
    }

    /**
     * Returns the resultion (ms / px) of the window
     */
    get windowResolution() {
        return this.windowDuration / window.innerWidth
    }

    update() {
        const resolutionIndex = this.closestZoomLevel(this.duration) - minTileZoom
        // The current layer we're going to update tiles on:
        const layer = this.layers[resolutionIndex]
        if (!layer) return
        this.currentLayer = layer
        this._windowDuration = TimeManager.calcIdealWindowDuration(this.duration)
        if (this.windowDuration !== this.prevWindowDuration) {
            Globals.events.emit('zoom', {
                detail: 1 - this.duration / parseFloat(Config.maxDuration),
            })
        }
        this.prevWindowDuration = this.windowDuration

        Globals.timeManager.setWindowDuration(this.windowDuration)

        // Scale the height of the group to match the
        // duration scale —> the more zoomed in the user is,
        // the taller it gets

        if (Globals.fullscreen) {
            this.container.scale.y = (window.innerHeight - majorTickHeight - minorTickHeight) / Config.tileHeight
            this.container.y = 0
        } else {
            let scale = logScale(
                this.duration,
                Config.tileScaleMax,
                Config.tileScaleMin,
                Config.minDuration,
                Config.maxDuration
            )
            scale = clamp(scale, Config.tileScaleMin, Config.tileScaleMax)
            this.container.scale.y = scale

            // Center container based off of scale
            this.container.y = window.innerHeight / 2 - this.height / 2
        }

        // Load tiles a bit off the sides of the viewport to prevent too much blurriness
        const loadingWindowStart = Globals.timeManager.windowStartTime - Globals.timeManager.idealWindowDuration
        const loadingWindowEnd = Globals.timeManager.windowEndTime + Globals.timeManager.idealWindowDuration
        // Start hiding/removing all the tiles.
        // Note, the next loop will override this
        // and show/keep tiles that are still in view.
        Object.keys(this.currentTiles).forEach((tileImage) => {
            const tile = this.currentTiles[tileImage]
            // Keep the most zoomed-out layer
            if (tile.layer.layerIndex) {
                // Don't garbage collect the lower zoom levels
                // unless they are out of the viewing range
                if (
                    tile.resolution >= preventGarbageCollectBelow ||
                    !tile.isInRange(loadingWindowStart, loadingWindowEnd)
                ) {
                    tile.remove()
                } else {
                    tile.hide()
                }
            }
        })

        // Fade in or keep tiles that are in view.
        // We'll only need to do this for layers that aren't the most zoomed-out layer
        let allLoaded = true
        if (resolutionIndex) {
            const audioPeriods = Globals.timeManager.getAudioPeriods(loadingWindowStart, loadingWindowEnd)
            // Give us the tiles for this range.
            // It returns the data for the tiles, not actual objects.
            let tiles = []
            for (let period of audioPeriods) {
                let t = this.tileDefinitions.getRange(
                    Math.max(loadingWindowStart, period.timeStart),
                    Math.min(loadingWindowEnd, period.timeEnd),
                    // To account for the negative indices
                    resolutionIndex + minTileZoom
                )
                tiles = tiles.concat(t)
            }

            if (tiles.length < 75) {
                tiles.forEach((item) => {
                    if (this.currentTiles[item.file]) {
                        const sprite = this.currentTiles[item.file]
                        if (resolutionIndex + minTileZoom === sprite.resolution && !sprite.loaded) {
                            allLoaded = false
                        }
                        sprite.keep()
                    } else {
                        // console.log(item, this.locationModel.timeInGap(item.time))

                        allLoaded = false
                        // Debounce new tile creation
                        if (!this.tileWindowChanging) {
                            const newSprite = new TileImage(item, layer)
                            this.currentTiles[item.file] = newSprite
                            layer.addChild(newSprite)
                            newSprite.on('TileImageRemoved', (target) => {
                                layer.removeChild(target)
                                target.destroy(true)
                                delete this.currentTiles[target.file]
                            })
                        }
                    }
                })
            }
        }

        // This logic is to keep another layer visible until
        // the new layer's tiles finish loading
        if (allLoaded === true) {
            // Record the time this layer was fully loaded
            layer.fullCoverageTime = new Date()
            if (!this.loaded) {
                this.loaded = true
                Globals.events.emit('load')

                // Feature detects Navigation Timing API support.
                if (window.performance) {
                    // Gets the number of milliseconds since page load
                    // (and rounds the result since the value must be an integer).
                    var timeSincePageLoad = Math.round(performance.now())

                    // Sends the timing event to Google Analytics.
                    gtag('event', 'timing_complete', {
                        name: 'spectrogram_load',
                        value: timeSincePageLoad,
                        event_category: 'Initial Spectrogram Load',
                    })
                }
            }
        }
        // Get closest layer with the most coverage of the window area
        const newestFullyLoadedLayer = this.layers.reduce((prev, current) =>
            prev.fullCoverageTime > current.fullCoverageTime ? prev : current
        )

        const heatmapHeight = this.height * 0.08

        //
        //  update position of heatmaps

        const beneathSpectrogram = Globals.fullscreen
            ? this.height - 1 - minorTickHeight
            : this.height - 1 + (window.innerHeight - this.height) / 2
        // If zoomed far enough in, show the similarity layer, and hide the classification layer
        if (this.duration < Config.similarityBreakpoint) {
            this.classificationLayer.hide()

            this.similarityLayer.position.y = this.container.position.y
            this.similarityLayer.heatmap.renderHeight = heatmapHeight
            this.similarityLayer.heatmap.position.y = beneathSpectrogram
        } else {
            this.classificationLayer.show()
            this.classificationLayer.position.y = beneathSpectrogram
        }

        // Only update similarity layer when classification layer is fully visible (covering)
        if (!this.classificationLayer.isFullyVisible()) {
            this.similarityLayer.update()
        } else {
            this.similarityLayer.clear()
        }

        this.classificationLayer.renderHeight = heatmapHeight
        this.classificationLayer.update()

        // Gap layer
        this.gapLayer.renderHeight = this.height + heatmapHeight
        this.gapLayer.renderHeight += Globals.fullscreen ? -1 - minorTickHeight : 3.5
        this.gapLayer.position.y = Globals.fullscreen ? 0 : (window.innerHeight - this.height) / 2 - Config.scalePadding
        this.gapLayer.update()

        // Update axis position
        this.axis.position.y = beneathSpectrogram + heatmapHeight
        this.axis.update()

        if (!Globals.fullscreen) {
            this.annotationLayer.visible = true
            this.annotationLayer.update()
        } else {
            this.annotationLayer.visible = false
        }
        this.frequencies.update()

        if (Globals.fullscreen) {
            this.paddingBandaid.visible = false
        } else {
            this.paddingBandaid.visible = true
            this.paddingBandaid.y = (window.innerHeight - this.height) / 2 - Config.scalePadding
        }

        this.moveToPlayhead.clear()
        if (this.mousePlayheadPosition && !Device.isTouch) {
            this.moveToPlayhead
                .lineStyle(1, 0xffffff)
                .moveTo(this.mousePlayheadPosition, Globals.fullscreen ? 0 : (window.innerHeight - this.height) / 2)
                .lineTo(
                    this.mousePlayheadPosition,
                    this.height + (Globals.fullscreen ? -minorTickHeight : (window.innerHeight - this.height) / 2)
                )
        }
        // tick will render the fade-in/out
        Object.keys(this.currentTiles).forEach((tileImage) => {
            const tile = this.currentTiles[tileImage]
            if (!allLoaded && tile.layer.layerIndex && tile.layer.layerIndex === newestFullyLoadedLayer.layerIndex) {
                // We're going to hang on to any tiles from
                // the recent layer that we've already loaded
                tile.keep()
            }
            tile.tick(this.duration)
        })
        this.dirty = false
    }

    getCurrentZoomLevel() {
        return this.closestZoomLevel(this.duration)
    }

    closestZoomLevel(ms) {
        return clamp(Math.round(TileDefinitions.getZoomLevel(ms)), minTileZoom, maxTileZoom)
    }

    closestTimeInterval(ms) {
        return TileDefinitions.zoomLevelDuration(this.closestZoomLevel(ms))
    }

    updateTileHeights() {
        Object.keys(this.currentTiles).forEach((tileImage) => {
            this.currentTiles[tileImage].updateHeight()
        })
    }

    resize() {
        this.axis.resize()
        this.paddingBandaid
            .clear()
            .beginFill(Config.bgColor)
            .drawRect(0, 0, window.innerWidth, Config.scalePadding)
            .endFill()
    }
}
