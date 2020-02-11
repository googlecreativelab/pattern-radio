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

import { Sprite, Texture, Rectangle, Graphics } from 'pixi.js'
import { Config, Globals } from '../globals'

export class TileImage extends Sprite {
    constructor(tile, layer) {
        super()
        this.file = tile.file
        this.time = tile.time
        this.duration = tile.duration
        this.resolution = tile.tileZoomLevel
        this.index = tile.index
        this.layer = layer
        this.alpha = 0
        this.removing = false
        this.hiding = false
        this.loaded = false
        this.loadImage(this.file)
    }

    set resolution(resolution) {
        this._resolution = resolution
    }

    get resolution() {
        return this._resolution
    }

    keep() {
        this.removing = false
        this.hiding = false
    }

    remove() {
        this.hide()
        this.removing = true
    }

    hide() {
        this.hiding = true
    }

    tick(duration) {
        if (this.loaded) {
            const speed = 0.04
            if (!this.hiding) {
                if (this.alpha < 1) {
                    this.alpha += speed
                } else if (this.alpha > 1) {
                    this.alpha = 1
                }
            } else {
                if (this.alpha > 0) {
                    this.alpha -= speed / 3
                } else {
                    this.handleRemove()
                }
            }
            // position and scale tile if it's loaded successfully and onscreen
            if (
                this.transform &&
                this.time < Globals.timeManager.windowEndTime &&
                this.time + this.duration > Globals.timeManager.windowStartTime
            ) {
                this.visible = true
                this.x = Globals.timeManager.timeToPx(this.time)

                // Is tile in a gap?
                const gaps = Globals.timeManager.getGaps(this.time, this.time + this.duration)
                if (gaps.length) {
                    // If tile is entirely in a gap, hide it.
                    if (gaps.find((g) => g.timeStart <= this.time && g.timeEnd >= this.time + this.duration)) {
                        this.visible = false
                    }
                    // If tile is starting in a gap, we need to move it
                    else if (Globals.timeManager.gapAtTime(this.time)) {
                        const gap = gaps.find((g) => g.timeStart <= this.time && g.timeEnd >= this.time)
                        if (gap) {
                            const offset = gap.timeEnd - this.time
                            const px = Globals.timeManager.timeToPx(gap.timeEnd)
                            this.x = px - offset / Globals.timeManager.resolution
                        }
                    }
                }
                this.width = (this.layer.tileDuration / duration) * Config.tileWidth
            } else {
                this.visible = false
            }

            if (Config.debug && this.texture && this._trimLine) {
                this._trimLine.clear()
            }
            const gaps = Globals.timeManager.getGaps(this.time, this.time + this.duration)
            if (gaps.length && this.texture) {
                // Check if theree is a gap at thee beginning
                if (Globals.timeManager.gapAtTime(this.time)) {
                    // Trim the texture
                    const gapEnd = gaps[gaps.length - 1].timeEnd - this.time
                    const pct = gapEnd / this.duration
                    this.texture.trim = new Rectangle(
                        this.texture.orig.width * pct,
                        0,
                        this.texture.orig.width * (1 - pct),
                        this.texture.orig.height
                    )

                    this.texture.frame = new Rectangle(
                        this.texture.orig.width * pct,
                        0,
                        this.texture.orig.width * (1 - pct),
                        this.texture.orig.height
                    )
                    // eslint-disable-next-line no-underscore-dangle
                    this.texture._updateUvs()

                    if (Config.debug && this._trimLine) {
                        this._trimLine.lineStyle(15, 0xffffff)
                        this._trimLine
                            .moveTo(0, this.textureHeight / 2 - 40)
                            .lineTo(this.textureWidth * pct, this.textureHeight / 2 - 40)
                    }
                }
                // Similarily, check if there is a gap at the end, and crop
                else if (Globals.timeManager.gapAtTime(this.time + this.duration)) {
                    const gapStart = gaps[0].timeStart - this.time
                    const pct = gapStart / this.duration
                    this.texture.trim = new Rectangle(0, 0, this.texture.orig.width * pct, this.texture.orig.height)
                    this.texture.frame = new Rectangle(0, 0, this.texture.orig.width * pct, this.texture.orig.height)
                    // eslint-disable-next-line no-underscore-dangle
                    this.texture._updateUvs()
                    if (Config.debug && this._trimLine) {
                        this._trimLine.lineStyle(15, 0xffffff)
                        this._trimLine
                            .moveTo(0, this.textureHeight / 2 + 40)
                            .lineTo(this.textureWidth * pct, this.textureHeight / 2 + 40)
                    }
                }
            }
        } else {
            this.handleRemove()
        }
    }

    handleRemove() {
        if (this.removing) {
            this.emit('TileImageRemoved', this)
        }
    }

    updateDebug() {}

    async loadImage(file) {
        try {
            const img = await TileImage.loadImageUrl(file)

            this.texture = img
            this.alpha = 0
            this.loaded = true

            this.textureWidth = this.texture.orig.width
            this.textureHeight = this.texture.orig.height

            if (Config.debug) {
                this.metadata = await TileImage.loadMetadata(file)
            }

            if (Config.debug) {
                this._line = new Graphics()
                this._line.position.set(0, 0)
                this._line
                    .lineStyle(2, 0xffffff)
                    .moveTo(0, 0)
                    .lineTo(this.textureWidth, this.textureHeight)
                    .moveTo(this.textureWidth, 0)
                    .lineTo(0, this.textureHeight)

                    .moveTo(0, 0)
                    .lineTo(0, this.textureHeight)
                    .moveTo(this.textureWidth, 0)
                    .lineTo(this.textureWidth, this.textureHeight)

                this.addChild(this._line)

                this._trimLine = new Graphics()
                this._trimLine.position.set(0, 0)
                this.addChild(this._trimLine)
            }

            this.height = Config.tileHeight
            // console.log(this.analyze(this))
        } catch (err) {
            // console.error(err)
            // Even if it returns an error,
            // we want to know it's done
            this.loaded = true
        }
        this.updateDebug()
        this.emit('TileImageLoaded')
    }

    static async loadMetadata(url) {
        return fetch(url, { method: 'HEAD' }).then((res) => {
            const metadata = {}
            if (res.status == 200) {
                res.headers.forEach(function(value, name) {
                    if (name.includes('x-goog-meta-')) {
                        name = name.replace('x-goog-meta-', '')
                        metadata[name] = value
                    } else if (name == 'last-modified') {
                        metadata[name] = value
                    }
                })
                return metadata
            } else {
                throw new Error('Not found')
            }
        })
    }

    static async loadImageUrl(url) {
        return new Promise((done, reject) => {
            const img = new Image()
            img.crossOrigin = 'Anonymous'
            img.addEventListener('load', () => {
                const texture = Texture.from(img)
                done(texture)
            })
            img.addEventListener('error', (err) => {
                reject(err)
            })
            img.src = url
        })
    }

    // Analyze image pixels (currently not used or run)
    analyze() {
        const pixels = Globals.pixiApp.renderer.plugins.extract.pixels(this)

        const numBins = 30
        const bins = new Array(numBins)
        for (let i = 0; i < numBins; i++) {
            bins[i] = 0
        }
        const skip = 1

        for (let i = 0; i < pixels.length; i += 4 * skip) {
            let p = pixels[i]
            p /= 256
            p *= numBins
            p = Math.floor(p)
            bins[p] += 1
        }

        for (let i = 0; i < numBins; i++) {
            bins[i] /= pixels.length / (4 * skip)
        }
    }

    isInRange(start, end) {
        return this.time < end && this.time + this.duration > start
    }

    updateHeight() {
        this.height = Config.tileHeight
    }
}
