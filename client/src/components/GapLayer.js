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

import { Container, Graphics, Sprite, Texture, extras, Text } from 'pixi.js'
import { Globals, Config } from '../globals'
import { minorTickHeight, timeFormats } from './Axis'

export class GapLayer extends Container {
    constructor() {
        super()
        this.graphics = new Graphics()
        this.addChild(this.graphics)
        this.interactiveChildren = false
        this.gapSprites = {}
    }

    update() {
        this.gaps = Globals.timeManager.getGaps(Globals.timeManager.windowStartTime, Globals.timeManager.windowEndTime)
        this.render()
    }

    render() {
        if (!Globals.timeManager.updated && !Globals.spectrogram.dirty) return
        Object.keys(this.gapSprites).forEach((gapKey) => {
            this.gapSprites[gapKey].removing = true
        })
        for (let gap of this.gaps) {
            const timeStart = gap.timeStart
            let gapSprite
            if (this.gapSprites[timeStart]) {
                gapSprite = this.gapSprites[timeStart]
                gapSprite.removing = false
                gapSprite.data = gap
            } else {
                gapSprite = new DataGap(this, gap)
                this.gapSprites[timeStart] = gapSprite
                this.addChild(gapSprite)
                gapSprite.on('DataGapRemoved', (target) => {
                    this.removeChild(target)
                    target.destroy({ children: true })
                    delete this.gapSprites[timeStart]
                })
            }
            gapSprite.update()
        }
        Object.keys(this.gapSprites).forEach((gapKey) => {
            this.gapSprites[gapKey].handleRemove()
        })
    }
}

class DataGap extends Container {
    constructor(gapLayer, gapData) {
        super()
        this.gapLayer = gapLayer
        this.data = gapData
        this.removing = false
        this.duration = this.time_end - this.time_start
        const background = new Sprite(Texture.WHITE)
        background.tint = Config.bgColor
        if (Config.debug) {
            background.alpha = 0.4
        }
        this.background = background
        this.addChild(this.background)
        const dashedLineGraphic = new Graphics()
        const dashSize = 2
        dashedLineGraphic
            .lineStyle(1, 0xffffff)
            .moveTo(0, 0)
            .lineTo(dashSize, 0)
            .lineStyle(1, Config.bgColor)
            .moveTo(dashSize, 0)
            .lineTo(dashSize * 2, 0)
        const dashedLineTexture = Globals.pixiApp.renderer.generateTexture(dashedLineGraphic)
        const dashedLine = new extras.TilingSprite(dashedLineTexture)
        dashedLine.height = 1
        dashedLine.width = 1
        this.dashedLine = dashedLine
        this.addChild(this.dashedLine)
        const textFormat = DataGap.multiFormat(this.data.timeEnd - this.data.timeStart)
        const textContent = 'No audio from\n' + textFormat(this.data.timeStart) + ' to ' + textFormat(this.data.timeEnd)
        this.text = new Text(textContent, {
            fontFamily: 'Roboto Mono',
            fontSize: 10,
            align: 'center',
            fill: '#FFFFFF',
            leading: 8,
        })
        this.text.anchor.set(0.5)
        this.addChild(this.text)
    }

    update() {
        const width = this.data.pixelPositionEnd - this.data.pixelPosition
        this.visible = width >= 1
        if (!this.visible) return
        this.background.width = width
        this.dashedLine.width = width
        this.dashedLine.y = this.gapLayer.renderHeight
        this.background.height = this.gapLayer.renderHeight
        this.x = this.data.pixelPosition
        this.text.visible = width > this.text.width + 20
        this.text.x = width / 2
        this.text.y = this.gapLayer.renderHeight / 2
    }

    handleRemove() {
        if (this.removing) {
            this.emit('DataGapRemoved', this)
        }
    }

    static multiFormat(duration) {
        return duration < 60000
            ? timeFormats.secondsFormat
            : duration < 8.64e7
            ? timeFormats.minutesFormat
            : timeFormats.monthDayFormatNoPadding
    }
}
