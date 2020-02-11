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

import { LitElement, html, css } from 'lit-element'
import { Application, Container, ticker } from 'pixi.js'
import * as TWEEN from '@tweenjs/tween.js'
import { Globals, Device, Config, updateGlobals } from '../globals'
import { Spectrogram } from '../components/Spectrogram'
import { Player } from '../components/Player'
import { spectrogramFilters } from './filter/Filter'

const playheadExtraHeight = 85

export class Canvas extends LitElement {
    static get properties() {
        return {
            currentLocation: {
                type: Object,
            },
            classifications: { type: Object, value: [] },
            audioLines: { type: Object, value: [] },
            spectrogram: { type: Object },
            scale: { type: Number },
            duration: { type: Number },
        }
    }

    static get styles() {
        return css`
            canvas {
                width: 100%;
                height: 100%;
                z-index: 1;
                transition: filter 0.5s ease-out;
            }

            #playhead {
                width: 2px;
                background: #ffffff;
                position: absolute;
                left: 50%;
                transform: translate(-50%, 0);
            }

            #playhead::after {
                content: '';
                width: 0;
                height: 0;
                border-left: 5px solid transparent;
                border-right: 5px solid transparent;
                border-bottom: 5px solid #ffffff;
                position: absolute;
                left: -4px;
                bottom: 0;
                display: block;
            }

            #playhead::before {
                content: '';
                display: block;
                width: 8px;
                position: absolute;
                height: 1px;
                background: #ffffff;
                left: -3px;
            }
            /* Landscape */
            @media only screen and (max-height: 499px) and (orientation: landscape), (min-aspect-ratio: 3/1) {
                #playhead {
                    display: none;
                }
            }
        `
    }

    constructor() {
        super()
        this.prevLocation = 100000000000000
        this.width = document.body.offsetWidth + (!Device.desktop ? 1 : 0)
        this.playheadHeight = 0
        this.playheadTop = 0
        this.playtime = 0
        this.playtimeMilestone = {}
        // this.classificationLayerMinimap = new ClassificationLayer(false)
    }

    update(changedProperties) {
        super.update(changedProperties)
        for (const key of changedProperties.keys()) {
            switch (key) {
                case 'currentLocation':
                    this._updateLocation()
                    break
                case 'duration':
                    this._updateDuration()
                    break
            }
        }
    }

    /**
     * Inherited method from lit-el
     * called when this module first renders
     *
     * Here's where we have all of our events
     */
    async firstUpdated() {
        this.canvas = this.shadowRoot.querySelector('canvas')
        if (!Config.skipIntro) {
            this.canvas.style.filter = 'blur(10px)'
        }
        this.spectrogramShowing = false

        this.pixiApp = new Application({
            autoResize: true,
            resolution: devicePixelRatio,
            view: this.canvas,
            backgroundColor: Config.bgColor,
        })
        PIXI.settings.MIPMAP_TEXTURES = false

        this.pixiApp.stage.visible = false
        ticker.shared.autoStart = false
        ticker.shared.stop()

        Globals.pixiApp = this.pixiApp

        this.resize()
        window.addEventListener('resize', () => {
            this.resize()
        })
    }

    async _updateLocation() {
        if (!Globals.player) {
            this.spectroContainer = new Container()
            this.spectroContainer.filters = spectrogramFilters
            this.spectroContainer.interactiveChildren = true

            const spectroGroup = new Container()
            spectroGroup.y = -Config.spectrogramOffset
            this.pixiApp.stage.addChild(spectroGroup)

            spectroGroup.addChild(this.spectroContainer)

            this.spectrogram = new Spectrogram(this.spectroContainer)
            this.spectrogram.location = this.currentLocation.name
            Globals.spectrogram = this.spectrogram
            this.spectrogram.duration = this.duration

            Globals.player = new Player(
                this.currentLocation.name,
                Globals.controls.position + this.currentLocation.startTime
            )
            Globals.player.duration = this.duration
            Globals.player.display = true

            this.draw()
        } else {
            // TODO: change spectrogram location
            this.spectrogram.location = this.currentLocation.name
            this.spectrogram.pause()
        }
    }

    _updateDuration() {
        if (Globals.player) {
            Globals.player.duration = this.duration
            this.spectrogram.duration = this.duration
        }
    }

    // TODO: make sure this can't run multiple times,
    //      might a few conditions where it does
    draw(timestamp) {
        if (Globals.player && this.spectrogram) {
            Globals.player.audioLoop()

            // Initial spectrogram motion when splash screen is showing
            if (Globals.controls.$$intro.showing && !Globals.controls.$$intro.hasShown) {
                Globals.controls.syncPositions(Globals.controls.position + Globals.controls.initialScrubIncrement)
                if (Globals.controls.position >= Globals.controls.maxInitialScrub - Globals.currentLocation.startTime) {
                    Globals.controls.initialScrubIncrement = 0
                }
            } else {
                // Typically, sync the app position to the audio Player unless we're scrubbing
                if (!this.spectrogram.tileWindowChanging) {
                    Globals.controls.syncPositions(Globals.player.time - Globals.currentLocation.startTime)
                }
            }
            if (Device.isTouch) {
                Globals.controls.scrub.handleMomentum()
            }
        }
        ticker.shared.update(timestamp)
        TWEEN.update(timestamp)
        requestAnimationFrame(this.draw.bind(this))

        Globals.timeManager.tick()
        Globals.events.emit('draw')

        this.updatePlaytime()
    }

    /**
     * Function keeping track of total play time for analytics purpose
     */
    updatePlaytime() {
        const t = Globals.player.time
        if (!this._lastPlayTime) this._lastPlayTime = t

        if (Globals.player.playing) {
            const delta = t - this._lastPlayTime
            this.playtime += delta

            const milestone = Math.floor(this.playtime / 5000)
            if (milestone > 0 && !this.playtimeMilestone[milestone]) {
                gtag('event', 'playtime', {
                    value: milestone * 5,
                    non_interaction: true,
                })
                this.playtimeMilestone[milestone] = true
            }
        }
        this._lastPlayTime = t
    }

    resize() {
        Globals.windowResizing = true

        updateGlobals()

        if (this.spectrogram) {
            this.spectrogram.updateTileHeights()
            this.spectrogram.update()
            this.spectrogram.resize()
        }

        // Tablet has 1px offset
        this.width = document.body.offsetWidth + (!Device.desktop ? 1 : 0)
        this.pixiApp.renderer.resize(this.width, document.body.offsetHeight)

        this.playheadHeight = Config.tileHeight * Config.tileScaleMax + playheadExtraHeight
        this.playheadTop =
            window.innerHeight / 2 - (Config.tileHeight * Config.tileScaleMax) / 2 - Config.spectrogramOffset - 1
        if (window.innerHeight < 680) {
            this.playheadHeight -= 30
        }

        Globals.events.emit('resize')
        Globals.windowResizing = false
        this.requestUpdate()
    }

    render() {
        return html`
            <style>
                #playhead {
                    height: ${this.playheadHeight}px;
                    top: ${this.playheadTop}px;
                }
            </style>
            <div id="playhead"></div>
            <canvas></canvas>
        `
    }
}

PIXI.interaction.InteractionManager.prototype.mapPositionToPoint = function mapPositionToPoint(point, x, y) {
    const rect = this.interactionDOMElement.getBoundingClientRect()

    const resolutionMultiplier = navigator.isCocoonJS ? this.resolution : 1.0 / this.resolution

    point.x = (x - rect.left) * (this.interactionDOMElement.width / rect.width) * resolutionMultiplier
    point.y = (y - rect.top) * (this.interactionDOMElement.height / rect.height) * resolutionMultiplier
}
