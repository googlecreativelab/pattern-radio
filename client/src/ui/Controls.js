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
import { start } from '../util/StartAudio'
import { Times, Config, Globals, Device } from '../globals'
import { throttle } from '../util/Throttle'
import { Scrub } from './Scrub'
import { WindowFocus } from '../util/WindowFocus'
import * as TWEEN from '@tweenjs/tween.js'
import { logScale, getLogPosition, clamp, scaleToRange, distance } from '../util/Math'
import { dateToUTCDateTimeString, msToTime } from '../util/Date'
import { TimeManager } from '../models/TimeManager'
import Tone, { Synth } from 'tone'
import { audioOutput } from '../components/AudioOutput'
import './Annotate'
import './Comment'
import './InfoBubble'
import './Tutorial'
import './SettingsModal'
import './ShareModal'

export class Controls extends LitElement {
    static get properties() {
        return {
            containerState: { type: String },
            showiOSNotice: { type: Boolean },
        }
    }

    static get styles() {
        return css`
            #logo-small {
                position: absolute;
                top: 44px;
                left: 20px;
                border: none;
                background: none;
                z-index: 4;
                cursor: pointer;
                color: #fff;
                transition: visibility ${Config.transitionTime}, opacity ${Config.transitionTime} linear;
                text-transform: uppercase;
                width: 24%;
                -moz-user-select: none;
                -khtml-user-select: none;
                -webkit-user-select: none;

                /*
                  Introduced in IE 10.
                  See http://ie.microsoft.com/testdrive/HTML5/msUserSelect/
                */
                -ms-user-select: none;
                user-select: none;
            }
            }

            #logo-small svg {
                height: 100%;
                width: 100%;
            }

            .about-wrap {
                position: absolute;
                top: 40px;
                right: 20px;
                z-index: 4;
                -moz-user-select: none;
                -khtml-user-select: none;
                -webkit-user-select: none;

                /*
                  Introduced in IE 10.
                  See http://ie.microsoft.com/testdrive/HTML5/msUserSelect/
                */
                -ms-user-select: none;
                user-select: none;
            }

            .about-button {
                font-family: 'Roboto Mono', monospace;
                font-weight: 500;
                display: flex;
                align-items: center;
                color: #fff;
                text-decoration: none;
                font-size: 12px;
                transition: 0.2s ease-in all;
                -moz-user-select: none;
                -khtml-user-select: none;
                -webkit-user-select: none;

                /*
                  Introduced in IE 10.
                  See http://ie.microsoft.com/testdrive/HTML5/msUserSelect/
                */
                -ms-user-select: none;
                user-select: none;
            }

            .about-button svg {
                height: 27px;
                width: 27px;
                fill: #fff;
                margin-left: 10px;
            }

            .about-button:hover {
                color: #bbffff;
                text-shadow: 0 0 5px #bbffff;
                background: none;
            }

            .pattern {
                font-weight: 700;
                font-family: 'Roboto Mono', monospace;
                letter-spacing: 4px;
                font-size: 18px;
            }

            .whale {
                font-weight: 100;
                font-family: 'Roboto Mono', monospace;
                letter-spacing: 4px;
                font-size: 18px;
            }

            tutorial-element {
                z-index: 54;
                position: relative;
            }

            comment-el {
                transition: visibility ${Config.transitionTime}, opacity ${Config.transitionTime} linear;
            }

            time-slider-element {
                transition: visibility ${Config.transitionTime}, opacity ${Config.transitionTime} linear;
            }

            share-modal.hide {
                opacity: 0;
                visibility: hidden;
                pointer-events: none;
            }

            #play {
                transition: visibility ${Config.transitionTime}, opacity ${Config.transitionTime} linear;
            }

            #play,
            #pause {
                cursor: pointer;
                position: absolute;
                left: 50%;
                transform: translateX(-50%);
                bottom: 30px;
                z-index: 2;
                display: block;
                background: transparent;
                height: 50px;
                width: 50px;
                transition: opacity 0.15s ease-out;
                padding: 0;
                border: 0;
            }

            #play svg,
            #pause svg {
                display: block;
                width: 100%;
                height: 100%;
                fill: #fff;
            }

            #play:hover svg,
            #pause:hover svg {
                fill: #bbffff;
                -webkit-filter: drop-shadow(0 0 5px #bbffff);
                filter: drop-shadow(0 0 5px #bbffff);
            }

            #canvas-container {
                position: absolute;
                width: 100%;
                height: 100%;
                top: 0;
                left: 0;
            }

            #label-start-time {
                display: none;
                position: absolute;
                left: 10px;
                bottom: 10px;
                z-index: 2;
            }

            #label-end-time {
                display: none;
                position: absolute;
                right: 10px;
                bottom: 10px;
                z-index: 2;
                text-align: right;
            }

            #label-current-time {
                position: absolute;
                left: 50%;
                padding-left: 2px;
                z-index: 2;
                top: 20px;
                /*pointer-events: none;*/
            }

            #time-slider {
                position: absolute;
                width: 100%;
                z-index: 2;
                left: 50%;
                bottom: 147px;
                transform: translate(-50%, 0);
            }
        
            @media only screen and (max-height: 731px) and (max-width: 411px) {
                #time-slider {
                    bottom: 18vh;
                }
            }
            
            @media only screen and (max-height: 612px) and (max-width: 411px) {
                #time-slider {
                    bottom: 21vh;
                }
            }

            #scale {
                position: absolute;
                z-index: 2;
                left: 1;
                top: 1;
            }

            #cluster-ui {
                position: absolute;
                top: 20px;
                left: 20px;
                z-index: 2;
                display: none;
            }

            #looking-at {
                z-index: 2;
                position: absolute;
                top: 60px;
                left: 20px;
            }

            #display-current-time {
                position: absolute;
                right: 50%;
                top: 50%;
                padding-right: 14px;
                z-index: 2;
                font-size: 13px;
                text-align: right;
                transform: translateY(-50%);
                margin-top: -225px;
            }

            #display-current-confidence {
                position: absolute;
                left: 50%;
                top: 50%;
                padding-left: 14px;
                z-index: 2;
                font-size: 13px;
                transform: translateY(-50%);
                margin-top: -225px;
            }

            #get-time {
                position: absolute;
                z-index: 4;
                bottom: 10px;
                right: 10px;
                color: #818181;
                font-size: 12px;
                padding: 15px;
                display: none;
            }

            #tutorialBtn {
                position: absolute;
                z-index: 3;
                left: 10px;
                top: 10px;
            }

            .controls {
                display: flex;
                position: absolute;
                bottom: 30px;
                left: 30px;
                transition: visibility ${Config.transitionTime}, opacity ${Config.transitionTime} linear;
                -moz-user-select: none;
                -khtml-user-select: none;
                -webkit-user-select: none;

                /*
                  Introduced in IE 10.
                  See http://ie.microsoft.com/testdrive/HTML5/msUserSelect/
                */
                -ms-user-select: none;
                user-select: none;
            }

            .control-link-item {
                cursor: pointer;
                display: flex;
                flex-direction: column;
                color: #fff;
                flex-direction: column;
                align-items: center;
                justify-content: flex-end;
                background: none;
                border: none;
                text-decoration: none;
                padding: 0;
                transition: 0.2s ease-in;
                outline: none;
            }

            .control-link-item.disabled {
                opacity: 0.4;
            }

            .control-link-item svg {
                fill: #fff;
                transition: 0.2s ease-in;
            }

            .control-link-item:focus,
            .control-link-item:active,
            .control-link-item:hover {
                color: #bbffff;
                text-shadow: 0 0 5px #bbffff;
            }

            .control-link-item:focus svg,
            .control-link-item:active svg,
            .control-link-item:hover svg {
                fill: #bbffff;
                -webkit-filter: drop-shadow(0 0 5px #bbffff);
                filter: drop-shadow(0 0 5px #bbffff);
            }

            .control-link-item.external {
                margin-left: 25px;
            }

            .control-link-item.help-mobile {
                display: none;
            }

            .control-link-item:not(:first-of-type) {
                margin-left: 25px;
            }

            .control-link {
                position: relative;
                top: -20px;
            }

            .control-link svg {
                height: 100%;
                width: 100%;
            }

            .settings {
                height: 15px;
                width: 25px;
            }

            .share-link {
                height: 22px;
                width: 22px;
                top: -14px;
            }

            .about {
                height: 25px;
                width: 25px;
                top: -14px;
            }

            .control-text {
                font-size: 12px;
                font-family: 'Roboto Mono', monospace;
            }

            .control-arrows {
                transform-origin: right;
                position: absolute;
                bottom: 30px;
                right: 30px;
                display: flex;
                flex-direction: row;
                align-items: center;
                z-index: 4;
                transition: visibility ${Config.transitionTime}, opacity ${Config.transitionTime} linear;
            }

            .ios-silent {
                padding: 12px 16px;
                color: #000;
                font-size: 14px;
                font-family: 'Roboto';
                letter-spacing: 1.55px;
                line-height: 1.714;
                position: absolute;
                background: #bbffff;
                text-align: center;
                border-radius: 4px;
                z-index: 100;
                width: 280px;
                bottom: 180px;
                left: 50%;
                transform: translateX(-50%);
            }

            .up,
            .down {
                padding: 6px;
                background: none;
                border: 1px solid rgba(255, 255, 255, 1);
                display: block;
                height: 25px;
                width: 25px;
                cursor: pointer;
                transition: 0.15s ease-in;
                -webkit-tap-highlight-color: rgba(0,0,0,0);
                outline: 0;
            }

            .up.disabled,
            .down.disabled {
                pointer-events: none;
                opacity: 0.3;
            }

            .up:hover,
            .down:hover {
                background: rgb(47, 47, 47);
            }

            .up svg,
            .down svg {
                height: 100%;
                width: 100%;
                pointer-events: none;
                fill: #fff;
                transition: opacity 0.15s ease-out;
            }

            .vertical {
                display: flex;
                flex-direction: column;
                margin-left: 30px;
                width: 25px;
                -moz-user-select: none;
                -khtml-user-select: none;
                -webkit-user-select: none;

                /*
                  Introduced in IE 10.
                  See http://ie.microsoft.com/testdrive/HTML5/msUserSelect/
                */
                -ms-user-select: none;
                user-select: none;
            }

            .down {
                position: relative;
                top: -1px;
            }

            ui.disabled,
            .disabled {
                opacity: 0.5;
                pointer-events: none !important;
            }

            .hidden {
                visibility: hidden;
                opacity: 0;
            }

            .ui {
                visibility: visible;
                opacity: 1;
                pointer-events: auto;
            }

            intro-element {
                transition: visibility 2s, opacity 2s ease-out, filter 2s ease-out;
                filter: blur(0px);
            }
            
            intro-element.hidden {
                pointer-events: none;
                filter: blur(60px);
                opacity: 0;
                visibility: hidden;
            }

            .intro .ui,
            .intro .ui.show {
                visibility: hidden;
                opacity: 0;
                filter: blur(20px);
            }

            .tutorial .ui {
                visibility: visible;
                opacity: 0.4;
                pointer-events: none;
            }

            .tutorial .ui.show {
                visibility: visible;
                opacity: 1;
                pointer-events: auto;
            }

            .settings-section-container {
                color: #fff;
                background: #000;
                position: absolute;
                top: -390px;
                left: 0;
                padding: 33px 13%;
                width: 20vw;
                max-width: 550px;
                z-index: 10;
                border: 1px solid white;
            }

            .settings-title {
                font-weight: 500;
                font-family: 'Roboto Mono', monospace;
                letter-spacing: 1px;
                font-size: 12px;
            }

            .settings-section-title {
                font-family: 'Roboto Mono', monospace;
                letter-spacing: 1px;
                font-size: 14px;
                margin-bottom: 20px;
            }

            .settings-section {
                border-top: 1px solid #4c4c4c;
                padding: 24px 0;
            }

            .settings-section-radio-title {
                font-family: 'Roboto Mono', monospace;
                letter-spacing: 1px;
                font-size: 13px;
            }

            .settings-section--radio {
                display: flex;
                border-top: none;
                flex-direction: row;
                align-items: center;
                padding: 24px 0;
            }

            .settings-section--audio {
                padding-bottom: 0;
            }

            .settings-section-input {
                margin-right: 10px;
            }

            /* styled fields */
            .container {
                display: inline-block;
                position: relative;
                padding-left: 30px;
                margin-bottom: 12px;
                cursor: pointer;
                -webkit-user-select: none;
                -moz-user-select: none;
                -ms-user-select: none;
                user-select: none;
            }

            .radio-wrap {
                display: flex;
                border: 1px solid white;
                height: 23px;
                position: relative;
                width: 52px;
                padding: 0px;
                border-radius: 14px;
            }

            .container input {
                position: absolute;
                opacity: 0;
                cursor: pointer;
            }

            .checkmark {
                position: absolute;
                top: 0;
                left: 0;
                height: 21px;
                width: 21px;
                background-color: #000;
                border-radius: 50%;
                border: 1px solid #fff;
            }

            .container:hover input ~ .checkmark {
                background-color: rgba(187, 255, 255, 0.4);
            }

            .container input:checked ~ .checkmark:before {
                content: ' ';
                position: absolute;
                z-index: 1;
                top: 5px;
                left: 5px;
                right: 5px;
                bottom: 5px;
                border: 5px solid #bbffff;
                border-radius: 50%;
            }

            .checkmark:after {
                content: '';
                position: absolute;
                display: none;
            }

            .container input:checked ~ .checkmark:after {
                display: block;
            }

            .radio-wrap .container .checkmark {
                border: none;
            }

            .radio-wrap .container input:checked ~ .checkmark:before {
                content: ' ';
                position: absolute;
                z-index: 1;
                top: 3px;
                left: 3px;
                right: 3px;
                bottom: 3px;
                border: 8px solid #bbffff;
                border-radius: 50%;
            }

            #audio-loading {
                position: absolute;
                bottom: 90px;
                right: 50%;
                transform: translateX(50%);
                font-size: 12px;
                color: #fff;
                font-weight: bold;
                pointer-events: none;
                -webkit-touch-callout: none;
                -webkit-user-select: none;
                -moz-user-select: none;
                user-select: none;
                visibility: hidden;
                opacity: 0;
                transition: visibility 0.8s, opacity 0.8s linear;
            }

            #audio-loading span {
                display: inline-block;
                vertical-align: middle;
            }

            #audio-loading.show {
                visibility: visible !important;
                opacity: 1 !important;
            }

            .circle-container {
                display: inline-block;
                vertical-align: middle;
                width: 16px;
                height: 16px;
                margin-right: 2px;
            }

            .circle {
                width: 100%;
                height: 100%;
                position: relative;
                left: 50%;
                top: 50%;
                transform: translate(-50%, -50%);
            }

            .circular-loader {
                height: 100%;
                width: 100%;
                position: absolute;
                top: 0;
                left: 0;
                transition: all 0.1s linear;
            }

            .loader-path {
                stroke: #ffffff;
                stroke-dasharray: 120;
                animation: dash 1.5s linear 0s infinite;
                animation-fill-mode: both;
                stroke-linecap: round;
                transform-origin: center center;
            }

            @keyframes dash {
                0% {
                    stroke-dashoffset: 120;
                }
                50% {
                    stroke-dashoffset: 30;
                    transform: rotate(240deg);
                }
                100% {
                    stroke-dashoffset: 120;
                    transform: rotate(720deg);
                }
            }

            @media only screen and (max-width: 1065px) {
                #logo-small {
                    width: 263px;
                }
            }

            @media only screen and (max-width: 957px) {
                #logo-small {
                    top: 20px;
                    left: 10px;
                    width: 215px;
                }

                .about-wrap {
                    z-index: 54px;
                    top: 17px;
                    right: 20px;
                }

                .about-wrap span {
                    visibility: hidden;
                }

                .about-wrap span::after {
                    content: 'About';
                    visibility: visible;
                }

                .outer {
                    position: relative;
                    left: 4px;
                    top: -1px;
                }

                .controls {
                    left: 18px;
                }

                .external,
                .control-text {
                    display: none;
                }

                .control-link-item.help-mobile {
                    display: block;
                    position: absolute;
                    bottom: 28px;
                    right: 83px;
                    z-index: 5;
                }
            }

            /* Landscape */
            @media only screen and (max-height: 499px) and (orientation: landscape), (min-aspect-ratio: 3/1) {
                #logo-small,
                .ui,
                .control-link-item.help-mobile,
                time-slider-element {
                    display: none;
                }

                #play,
                #pause {
                    bottom: 140px;
                }
                
                #audio-loading {
                    bottom: 200px;
                }
            }


            @media (hover: none) {
                .up:hover,
                .down:hover { background: transparent; }
            }
        `
    }

    constructor() {
        super()
        this.settingsOpen = false
        this.shareUrl
        this.iOS = !!navigator.platform && /iPad|iPhone|iPod/.test(navigator.platform)
        this.showiOSNotice = false
        this.hasShowniOSNotice = false
        Times.scaleStartTimeDate = new Date()
        Times.currentTimeDate = new Date()
        Times.scaleEndTimeDate = new Date()
        this._location = null
        // Duration of a tile within the window
        this.duration = parseFloat(Config.defaultDuration)
        if (!Config.skipIntro) {
            this.duration /= Config.initialZoom
        }
        const fps = 60
        const pxPerSecond = 20
        const initialScrubTime = 120
        this.initialScrubIncrement =
            (TimeManager.calcIdealWindowDuration(this.duration) * pxPerSecond) / fps / window.innerWidth
        this.maxInitialScrub = Config.defaultPosition + this.initialScrubIncrement * fps * initialScrubTime
        // The length of the location's audio
        this.length = 0
        this.position = 0
        this.firstLocation = true
        this.showAudioLoading = false
        this.disableIntro = Config.skipIntro
        this.disableAnnotate = !Config.annotate
        this.containerState = this.disableIntro ? 'active' : 'intro'
        this.tweens = {
            position: new TWEEN.Tween(this),
            duration: new TWEEN.Tween(this),
            linearDuration: new TWEEN.Tween(this),
        }
        this.tweens.position
            .easing(TWEEN.Easing.Quadratic.InOut)
            .onStart(() => {
                this.pauseWhileScrubbing()
            })
            .onUpdate(() => {
                this.pauseWhileScrubbing()
            })
            .onComplete(() => {
                if (this.scrub.moving) {
                    this.scrub.dragStop()
                }
                Globals.events.emit('positionTweenComplete')
            })
        this.tweens.duration.easing(TWEEN.Easing.Quadratic.Out).onComplete((controls) => {
            this.linearScale = getLogPosition(
                controls.duration,
                parseFloat(Config.minDuration),
                parseFloat(Config.maxDuration)
            )
            this.linearScaleSnapshot = this.linearScale
            Globals.events.emit('durationTweenComplete')
        })
        this.tweens.linearDuration.onComplete((controls) => {
            this.linearScale = getLogPosition(
                controls.duration,
                parseFloat(Config.minDuration),
                parseFloat(Config.maxDuration)
            )
            this.linearScaleSnapshot = this.linearScale
        })
        this.uiVisibilityState = Config.skipIntro ? 10 : 0
    }

    set location(location) {
        this._location = location
        Globals.currentLocation = location
        if (this.firstLocation) {
            this.position = parseFloat(Config.defaultPosition) - this.location.startTime
            if (parseFloat(Config.defaultPosition) < this.location.startTime) {
                this.position = parseFloat(Config.defaultPosition)
            }
            if (Config.time) {
                this.position = Config.time - this.location.startTime
            }
            this.firstLocation = false
        } else {
            this.position = 0
        }
        Globals.timeManager.setCurrentTime(this.location.startTime + this.position)

        this.$$canvas.currentLocation = location
        this.length = this._location.duration

        // TODO: get rid of this timeout
        setTimeout(() => {
            this.$$timeSlider.value = this.position
            this.$$timeSlider.date = this.position + Globals.currentLocation.startTime
        }, 1)
        this.linearScale = getLogPosition(this.duration, parseFloat(Config.minDuration), parseFloat(Config.maxDuration))
        // used for pinch zoom
        this.linearScaleSnapshot = this.linearScale
        this.requestUpdate()
    }

    get location() {
        return this._location
    }

    set duration(duration) {
        this.debounceTileLoading()
        this._duration = duration
        this.requestUpdate()
    }

    get duration() {
        return this._duration
    }

    // Setting app position debounces tile and audio loading by default
    // use syncPositions on its own to set app position without debouncing
    set position(position) {
        this.debounceAudioLoading()
        this.debounceTileLoading()
        this.syncPositions(position)
    }

    get position() {
        return this._position
    }

    syncPositions(position) {
        this._position = position
        if (Globals.player) {
            const time = this.location.startTime + this.position
            this.$$timeSlider.value = position
            this.$$timeSlider.date = time
            Globals.timeManager.setCurrentTime(time)
            if (!Globals.player.playing) {
                Globals.player.time = time
            }
            Globals.spectrogram.time = time
        }
    }

    // Read only prop, use duration to adjust scale
    get scale() {
        return this.duration / this.length
    }

    saveAnnotation(event) {
        const start = new Date(Globals.timeManager.pxToTime(event.detail.startX))
        const end = new Date(Globals.timeManager.pxToTime(event.detail.endX))

        const text = `${this.location.name}\t${start.toISOString()}\t${end.toISOString()}`
        navigator.clipboard.writeText(text)
    }

    navigateTo(position, _duration, _callback) {
        const duration = clamp(_duration, Config.minDuration, Config.maxDuration)

        const durationDiff = this.duration - duration
        const posDiff = Globals.timeManager.currentTime - position
        // Calculate how many screen widths its moving
        const screenMoveFactor = Math.abs(posDiff / Math.max(_duration, this.duration))

        const dur = 750
        let durDelay = 0
        let posDelay = 0

        // Determine if one of the tweens should be delayed (let it zoom out first for example)
        if (durationDiff > this.duration * 0.1) {
            durDelay = dur * 0.7
        } else if (-durationDiff > this.duration * 0.1) {
            posDelay = dur * 0.7
        }

        // If we need to move far, do an initial zoom out
        let initialTween
        if (screenMoveFactor > 5 && this.duration != Config.maxDuration) {
            let moveDuration = (Math.max(_duration, this.duration) * screenMoveFactor) / 5
            if (moveDuration > this.duration) {
                initialTween = new TWEEN.Tween(this).to({ duration: moveDuration }, dur)
                durDelay = dur * 0.7
                posDelay = 0
            }
        }

        // Do the tweening
        let posTween = this.tweens.position
            .stop()
            .delay(posDelay)
            .to({ position: position - Globals.currentLocation.startTime }, dur)
        let durTween = this.tweens.duration
            .stop()
            .delay(durDelay)
            .to({ duration }, dur)

        // Start the tweening
        if (!initialTween) {
            durTween.start()
            posTween.start()
        } else {
            // If there is an initial tween, delay the others
            initialTween.chain(durTween, posTween).start()
        }

        const callback = () => {
            _callback()
            // We need to set the duration for updates to happen
            this.duration = duration
        }

        if (posDelay < posDelay) {
            Globals.events.once('durationTweenComplete', callback)
        } else {
            Globals.events.once('positionTweenComplete', callback)
        }
    }

    /**
     * Inherited method from lit-el
     * called when this module first renders
     *
     * Here's where we have all of our events
     */
    async firstUpdated() {
        this.$$canvas = this.shadowRoot.querySelector('canvas-element')
        this.$$timeSlider = this.shadowRoot.querySelector('#time-slider')
        this.$$playButton = this.shadowRoot.querySelector('#play')
        this.$$pause = this.shadowRoot.querySelector('#pause')
        this.$$comment = this.shadowRoot.querySelector('comment-el')
        this.$$infoBubble = this.shadowRoot.querySelector('info-bubble')
        this.$$settingsModal = this.shadowRoot.querySelector('settings-modal')
        this.$$shareModal = this.shadowRoot.querySelector('share-modal')
        this.$$intro = this.shadowRoot.querySelector('intro-element')
        this.$$tutorial = this.shadowRoot.querySelector('tutorial-element')

        this.$$intro.addEventListener('close', () => {
            this.disableIntro = true
            if (!this.hasShowniOSNotice && this.iOS) {
                this.showiOSNotice = true
                this.hasShowniOSNotice = true
                const noticeCloseHandler = () => {
                    this.showiOSNotice = false
                    document.removeEventListener('touchstart', noticeCloseHandler)
                }
                document.addEventListener('touchstart', noticeCloseHandler)
            }
            this.containerState = 'active'
            this.shadowRoot.querySelector('comment-el').disabled = false
            setTimeout(() => {
                this.$$canvas.canvas.style.filter = 'none'
            }, 1000)

            if (!this.$$intro.hasShown && Globals.spectrogram) {
                const initialTweenTime = 750
                this.tweens.position
                    .stop()
                    .to(
                        {
                            position: parseFloat(Config.defaultPosition) - Globals.currentLocation.startTime,
                        },
                        initialTweenTime
                    )
                    .start()
                this.tweens.duration
                    .stop()
                    .to(
                        {
                            duration: Config.defaultDuration,
                        },
                        initialTweenTime
                    )
                    .start()
            }
            this.requestUpdate()
        })
        this.$$comment.hide()

        this.$$classifications = this.shadowRoot.querySelector('#classifications')
        this.$$timeSlider.addEventListener('input', (_event) => {
            this.position = parseFloat(this.$$timeSlider.value, 10)
        })
        this.$$playButton.addEventListener('click', (_event) => {
            gtag('event', 'click_play')
            this.playAudio()
        })
        this.$$pause.addEventListener('click', (_event) => {
            gtag('event', 'click_pause')
            this.pauseAudio()
        })
        const handleDraw = throttle(() => {
            this._updateTimecodes()
        }, 100)
        Globals.events.on('draw', (_event) => {
            handleDraw()
        })
        document.body.addEventListener('keyup', (e) => {
            if (!this.$$intro.showing && e.keyCode === 32) {
                if (this.playing) {
                    this.pauseAudio()
                } else {
                    this.playAudio()
                }
            }
        })
        Globals.events.on('load', () => {
            this.requestUpdate()
            this.$$comment.requestUpdate()
            Globals.pixiApp.stage.visible = true
        })

        this.scrub = new Scrub(this.$$canvas)
        Globals.events.on('scrub', (event) => {
            if (this.tweens.position.isPlaying()) return
            this.pauseWhileScrubbing()
            // Time they start dragging
            const targetMoveDuration = this.location.startTime + event.detail.duration

            let position = event.detail.dragStartTime - targetMoveDuration

            // Set Bounds
            position = clamp(position, 0, this.location.duration)
            // Update the slider pos and the position propertiy
            this.position = position
        })
        Globals.events.on('move', (event) => {
            if (this.tweens.position.isPlaying()) return
            this.pauseWhileScrubbing()
            let position = this.position + event.detail.distance
            position = clamp(position, 0, this.location.duration)
            this.position = position
        })

        Globals.events.on('pinchStart', () => {
            this.linearScaleSnapshot = this.linearScale
        })
        Globals.events.on('wheel', () => {
            this.maxIn = false
            this.maxOut = false
            this.clearZoomInterval()
        })
        Globals.events.on('pinch', (event) => {
            if (this.tweens.duration.isPlaying()) return
            const screenDistance = distance(0, window.innerHeight, window.innerWidth, 0)
            const zoomMagnitude = 60
            const zoom = scaleToRange(event.detail.distance, 0, screenDistance, 0, zoomMagnitude)
            this.linearScale = clamp(this.linearScaleSnapshot - zoom, 0, 100)
            this.duration = logScale(this.linearScale, parseFloat(Config.minDuration), parseFloat(Config.maxDuration))
        })

        Globals.events.on('verticalScroll', (event) => {
            if (this.tweens.duration.isPlaying()) return
            const speed = 0.03 * event.detail.deltaY
            this.linearScale = clamp(this.linearScale + speed, 0, 100)
            this.duration = logScale(this.linearScale, parseFloat(Config.minDuration), parseFloat(Config.maxDuration))
        })

        this.$$classifications.addEventListener('input', async (_event) => {
            Config.isCluster = this.$$classifications.checked
        })

        Globals.events.on('tutorial', (event) => {
            let step = event.step

            this.shadowRoot.querySelector('.control-arrows').classList.remove('show')
            this.shadowRoot.querySelector('.controls').classList.remove('show')
            this.shadowRoot.querySelector('#time-slider').classList.remove('show')
            this.shadowRoot.querySelector('comment-el').classList.remove('show')
            this.shadowRoot.querySelector('comment-el').disabled = true
            switch (step) {
                case 1:
                    this.playAudio()
                    break
                case 4:
                    this.shadowRoot.querySelector('.control-arrows').classList.add('show')
                    break
                case 9:
                    this.shadowRoot.querySelector('#time-slider').classList.add('show')
                case 10:
                    this.shadowRoot.querySelector('.controls').classList.add('show')
                    break
                case 11:
                    this.shadowRoot.querySelector('comment-el').classList.add('show')
                    this.shadowRoot.querySelector('comment-el').disabled = false
                    break
            }
        })

        Globals.events.on('resize', () => {
            if (!Globals.fullscreen) {
                this.$$comment.show()
            } else {
                this.$$comment.hide()
            }
        })

        const windowFocus = new WindowFocus()
        windowFocus.on('focus-change', (bool) => {
            if (!bool && document.body.classList.contains('touch-device')) {
                this.pauseAudio()
            }
        })
    }

    async playAudio() {
        // activate Tone
        new Tone.Synth().connect(audioOutput).toMaster()
        await start()
        Globals.player.start()
        this.$$playButton.style.display = 'none'
        this.$$pause.style.display = 'flex'
        this.playing = true
        this.pausedForScrubbing = false
    }

    pauseAudio() {
        Globals.player.pause()
        this.$$playButton.style.display = 'flex'
        this.$$pause.style.display = 'none'
        this.playing = false
    }

    pauseWhileScrubbing() {
        if (this.playing) {
            this.pausedForScrubbing = true
            this.showAudioLoading = true
            this.pauseAudio()
        } else {
            if (this.pausedForScrubbing) {
                clearTimeout(this.replayTimeout)
                this.replayTimeout = setTimeout(() => {
                    this.playAudio()
                }, 100)
            }
        }
    }

    debounceAudioLoading() {
        Globals.isScrubbing = true
        clearTimeout(this.mouseMoveTimeout)
        this.mouseMoveTimeout = setTimeout(() => {
            Globals.isScrubbing = false
        }, 500)
    }

    debounceTileLoading() {
        const debounceTime = 20
        if (Globals.spectrogram && !this.scrub.handlingPinchMomentum) {
            Globals.spectrogram.tileWindowChanging = true
            clearTimeout(this.tileWindowTimeout)
            this.tileWindowTimeout = setTimeout(() => {
                Globals.spectrogram.tileWindowChanging = false
            }, debounceTime)
        }
    }

    _updateTimecodes() {
        if (!Globals.player) return
        const position = Globals.player.time
        Times.scaleStartTimeMs = position - this.duration / 2
        Times.currentTimeMs = position
        Times.scaleEndTimeMs = position + this.duration / 2

        Times.scaleStartTimeDate = new Date(Times.scaleStartTimeMs)
        Times.currentTimeDate = new Date(Times.currentTimeMs)
        Times.scaleEndTimeDate = new Date(Times.scaleEndTimeMs)
        this.requestUpdate()
    }

    currentTimeClick() {
        this.$$shareModal.open = !this.$$shareModal.open
        let url = location.protocol + '//' + location.host + location.pathname

        let anchor = '#' + Math.round(Globals.player.time / 1000)
        anchor += 'z' + Globals.spectrogram.getCurrentZoomLevel()

        if (Globals.currentLocation.name && Globals.currentLocation.name != Config.defaultLocation) {
            url += `?location=${Globals.currentLocation.name}`
        }

        url += anchor
        this.$$shareModal.url = url
        this.$$shareModal.timestamp = Globals.player.time
    }

    showIntro() {
        this.disableIntro = false
        this.containerState = 'intro'
        if (Globals.player.playing) {
            this.pauseAudio()
        }
        // if (this.$$tutorial.showing) {
        //     this.$$tutorial.hide()
        // }
        this.$$intro.show()
        this.$$canvas.canvas.style.filter = 'blur(10px)'
    }

    handleZoomButton(e) {
        const direction = e.currentTarget.classList.contains('up') ? -1 : 1
        const zoomRepeat = 90
        this.doZoom(direction)
        this.zoomInterval = setInterval(() => {
            this.doZoom(direction)
        }, zoomRepeat)
    }

    doZoom(direction) {
        if (
            (direction === 1 && this.duration === Config.maxDuration) ||
            (direction === -1 && this.duration === Config.minDuration)
        ) {
            return
        }
        this.maxIn = false
        this.maxOut = false
        const zoomTime = 100
        const zoomMagnitude = 0.5
        const speed = this.duration * zoomMagnitude * direction
        this.tweens.linearDuration
            .stop()
            .to(
                {
                    duration: clamp(this.duration + speed, Config.minDuration, Config.maxDuration),
                },
                zoomTime
            )
            .start()
    }

    clearZoomInterval() {
        if (this.duration <= Config.minDuration + 1000) {
            this.maxIn = true
        }
        if (this.duration >= Config.maxDuration - 1000) {
            this.maxOut = true
        }
        clearInterval(this.zoomInterval)
    }

    get loaded() {
        if (Globals.spectrogram) {
            return Globals.spectrogram.loaded && Globals.spectrogram.classificationLayer.loaded
        } else {
            return false
        }
    }

    get audioLoading() {
        return (
            (this.playing || this.pausedForScrubbing) &&
            (this.showAudioLoading ||
                (Globals.player && (Globals.player.buffering || Globals.player.playingWithoutAudio)))
        )
    }

    render() {
        return html`
            <style>
                #position {
                    bottom: ${Config.controlsHeight + 27}px;
                }
            </style>
            <div id="ui-container" class="${this.containerState}">
                <tutorial-element></tutorial-element>
                <div class="about-wrap ui">
                    <a
                        class="about-button"
                        target="_blank"
                        href="https://medium.com/@alexanderchen/pattern-radio-whale-songs-242c692fff60"
                        id="about"
                    >
                        <span>About the project</span>
                    </a>
                </div>
                <button id="logo-small" @click=${this.showIntro} class="ui show">
                    <img
                        src="/assets/pattern-radio-whale-song.svg"
                        width="100%"
                        height="auto"
                        alt="Pattern Radio: Whale Song"
                    />
                </button>

                <button id="play" class="${!this.loaded ? 'disabled' : ''} ui show">
                    <svg
                        version="1.1"
                        id="Layer_1"
                        xmlns="http://www.w3.org/2000/svg"
                        xmlns:xlink="http://www.w3.org/1999/xlink"
                        x="0px"
                        y="0px"
                        viewBox="0 0 82 82"
                        style="enable-background:new 0 0 82 82;"
                        xml:space="preserve"
                    >
                        <path
                            d="M41,82C18.4,82,0,63.6,0,41S18.4,0,41,0s41,18.4,41,41S63.6,82,41,82z M41,2C19.5,2,2,19.5,2,41s17.5,39,39,39
                    s39-17.5,39-39S62.5,2,41,2z"
                        />
                        <path d="M32,57V25l26,16L32,57z M34,28.6v24.8L54.2,41L34,28.6z" />
                    </svg>
                </button>
                <button id="pause" style="display: none">
                    <svg
                        version="1.1"
                        id="Layer_1"
                        xmlns="http://www.w3.org/2000/svg"
                        xmlns:xlink="http://www.w3.org/1999/xlink"
                        x="0px"
                        y="0px"
                        viewBox="0 0 82 82"
                        style="enable-background:new 0 0 82 82;"
                        xml:space="preserve"
                    >
                        <rect x="30" y="25" width="2" height="32" />
                        <rect x="50" y="25" width="2" height="32" />
                        <path
                            d="M41,82C18.4,82,0,63.6,0,41S18.4,0,41,0s41,18.4,41,41S63.6,82,41,82z M41,2C19.5,2,2,19.5,2,41s17.5,39,39,39
               s39-17.5,39-39S62.5,2,41,2z"
                        />
                    </svg>
                </button>
                <label id="cluster-ui">
                    <input id="classifications" type="checkbox" ?checked="${Config.isCluster}" />
                    Cluster
                </label>
                <div id="canvas-container">
                    <time-slider-element
                        class="${!this.loaded ? 'disabled' : ''} ui"
                        id="time-slider"
                        scale=${this.scale}
                        min="0"
                        max=${this.length}
                        value="0"
                        @input="${this.pauseWhileScrubbing}"
                    ></time-slider-element>
                    <p id="label-start-time">
                        Start Position<br />
                        <span>
                            ${msToTime(Times.currentTimeMs - this.duration / 2)}
                        </span>
                    </p>
                    ${this.location && Config.debug
                        ? html`
                              <p id="label-current-time">
                                  Current Position<br />
                                  ${msToTime(Times.currentTimeMs)} <br />
                                  <span
                                      >Seconds: ${Times.currentTimeMs - this.location.startTime} | Time:
                                      ${Times.currentTimeMs}<br />
                                      ${dateToUTCDateTimeString(Times.currentTimeDate)} | Duration: ${this.duration}
                                  </span>
                                  <br />${Globals.player
                                      ? html`
                                            <span>Filename: ${Globals.player.currentFilename}</span>
                                        `
                                      : ''}
                              </p>
                          `
                        : ''}
                    <p id="label-end-time">
                        End Position<br />
                        <span>${msToTime(Times.currentTimeMs + this.duration / 2)}</span>
                    </p>
                    ${this.lookingAt
                        ? html`
                              <div id="looking-at">
                                  <p><strong>Looking at:</strong></p>
                                  <p>
                                      classifier: ${this.lookingAt.classifier}
                                  </p>
                                  <p>label: ${this.lookingAt.label}</p>
                                  <p>score: ${this.lookingAt.score}</p>
                                  <p>
                                      time_start: ${this.lookingAt.time_start}
                                      ${dateToUTCDateTimeString(new Date(this.lookingAt.time_start))}
                                  </p>
                                  <p>
                                      time_end: ${this.lookingAt.time_end}<br />
                                      ${dateToUTCDateTimeString(new Date(this.lookingAt.time_end))}
                                  </p>
                              </div>
                          `
                        : html``}
                    <canvas-element
                        scale=${this.scale}
                        position=${this.position}
                        duration=${this.duration}
                    ></canvas-element>
                </div>

                ${!this.loaded && (Config.skipIntro || (this.$$intro && !this.$$intro.showing))
                    ? html`
                          <loader-element background="true"></loader-element>
                      `
                    : html``}
                <div class="controls${!this.loaded ? ' disabled' : ''} ui">
                    <settings-modal></settings-modal>
                    <share-modal url="${this.shareUrl}"></share-modal>
                    <button
                        class="control-link-item settings-wrap ${this.$$shareModal && this.$$shareModal.open
                            ? ' disabled'
                            : ''}"
                        @click=${() => {
                            setTimeout(() => {
                                this.$$settingsModal.open = !this.$$settingsModal.open
                            }, 1)
                        }}
                    >
                        <div class="control-link settings">
                            <svg
                                version="1.1"
                                id="Layer_1"
                                xmlns="http://www.w3.org/2000/svg"
                                xmlns:xlink="http://www.w3.org/1999/xlink"
                                x="0px"
                                y="0px"
                                viewBox="0 0 25 17"
                                style="enable-background:new 0 0 25 17;"
                                xml:space="preserve"
                            >
                                <path
                                    class="st0"
                                    d="M24,3h-2.1c-0.2-1.7-1.7-3-3.4-3s-3.2,1.3-3.4,3H1v1h14.1c0.2,1.7,1.7,3,3.4,3s3.2-1.3,3.4-3H24V3z M18.5,6
                      C17.1,6,16,4.9,16,3.5S17.1,1,18.5,1S21,2.1,21,3.5S19.9,6,18.5,6z"
                                />
                                <path
                                    class="st0"
                                    d="M24,13H9.9c-0.2-1.7-1.7-3-3.4-3s-3.2,1.3-3.4,3H1v1h2.1c0.2,1.7,1.7,3,3.4,3s3.2-1.3,3.4-3H24V13z M6.5,16
                      C5.1,16,4,14.9,4,13.5S5.1,11,6.5,11S9,12.1,9,13.5S7.9,16,6.5,16z"
                                />
                            </svg>
                        </div>
                        <span class="control-text">
                            Settings
                        </span>
                    </button>
                    <button
                        @click="${this.currentTimeClick}"
                        class="control-link-item share-wrap ${this.$$settingsModal && this.$$settingsModal.open
                            ? ' disabled'
                            : ''}"
                    >
                        <div class="control-link share-link">
                            <svg
                                version="1.1"
                                id="Layer_1"
                                xmlns="http://www.w3.org/2000/svg"
                                xmlns:xlink="http://www.w3.org/1999/xlink"
                                x="0px"
                                y="0px"
                                viewBox="0 0 24 24"
                                style="enable-background:new 0 0 24 24;"
                                xml:space="preserve"
                            >
                                <path
                                    class="st0"
                                    d="M20.5,17c-1.3,0-2.4,0.7-3,1.7L6.8,13.6C6.9,13.3,7,12.9,7,12.5c0-0.3-0.1-0.6-0.1-0.9l10.8-6.1
                      C18.3,6.4,19.3,7,20.5,7C22.4,7,24,5.4,24,3.5S22.4,0,20.5,0S17,1.6,17,3.5c0,0.4,0.1,0.7,0.2,1.1L6.5,10.6C5.8,9.7,4.7,9,3.5,9
                      C1.6,9,0,10.6,0,12.5S1.6,16,3.5,16c1.2,0,2.2-0.6,2.8-1.5l10.8,5.1C17,19.9,17,20.2,17,20.5c0,1.9,1.6,3.5,3.5,3.5s3.5-1.6,3.5-3.5
                      S22.4,17,20.5,17z M20.5,1C21.9,1,23,2.1,23,3.5S21.9,6,20.5,6S18,4.9,18,3.5S19.1,1,20.5,1z M3.5,15C2.1,15,1,13.9,1,12.5
                      C1,11.1,2.1,10,3.5,10S6,11.1,6,12.5C6,13.9,4.9,15,3.5,15z M20.5,23c-1.4,0-2.5-1.1-2.5-2.5s1.1-2.5,2.5-2.5s2.5,1.1,2.5,2.5
                      S21.9,23,20.5,23z"
                                />
                            </svg>
                        </div>
                        <span class="control-text">
                            Share Link
                        </span>
                    </button>
                    <button
                        @click=${() => {
                            this.$$tutorial.show = true
                        }}
                        class="control-link-item external ${(this.$$settingsModal && this.$$settingsModal.open) ||
                        (this.$$shareModal && this.$$shareModal.open)
                            ? ' disabled'
                            : ''}"
                    >
                        <div class="control-link about">
                            <svg
                                version="1.1"
                                id="Layer_1"
                                xmlns="http://www.w3.org/2000/svg"
                                xmlns:xlink="http://www.w3.org/1999/xlink"
                                x="0px"
                                y="0px"
                                viewBox="0 0 27 27"
                                style="enable-background:new 0 0 27 27;"
                                xml:space="preserve"
                            >
                                <path
                                    class="st0"
                                    d="M12.5,16.4c0-0.4,0-0.8,0.1-1c0-0.3,0.1-0.5,0.2-0.7c0.1-0.2,0.2-0.4,0.4-0.6c0.2-0.2,0.4-0.4,0.7-0.7
                      c0.2-0.2,0.4-0.4,0.6-0.6s0.4-0.4,0.6-0.7c0.2-0.2,0.3-0.5,0.4-0.8s0.2-0.5,0.2-0.8c0-0.6-0.2-1.1-0.6-1.5c-0.4-0.3-0.9-0.5-1.6-0.5
                      c-0.3,0-0.5,0-0.8,0.1c-0.3,0.1-0.5,0.2-0.7,0.3c-0.2,0.1-0.4,0.3-0.5,0.5c-0.1,0.2-0.2,0.5-0.2,0.8H9.7c0-0.5,0.1-0.9,0.3-1.3
                      s0.5-0.7,0.8-1c0.3-0.3,0.7-0.5,1.2-0.6C12.5,7.1,13,7,13.5,7c0.6,0,1.1,0.1,1.6,0.2c0.5,0.1,0.9,0.4,1.2,0.7s0.6,0.6,0.7,1
                      s0.3,0.9,0.3,1.4c0,0.4-0.1,0.8-0.2,1.2c-0.1,0.4-0.3,0.7-0.6,1.1c-0.2,0.3-0.5,0.6-0.8,0.9s-0.6,0.6-0.8,0.8
                      c-0.2,0.2-0.3,0.3-0.4,0.5s-0.2,0.3-0.2,0.5s-0.1,0.3-0.1,0.5c0,0.2,0,0.4,0,0.6H12.5z M12.3,19.1c0-0.3,0.1-0.5,0.3-0.7
                      s0.4-0.3,0.8-0.3s0.6,0.1,0.8,0.3s0.3,0.4,0.3,0.7c0,0.3-0.1,0.5-0.3,0.7s-0.4,0.3-0.8,0.3s-0.6-0.1-0.8-0.3S12.3,19.4,12.3,19.1z"
                                />
                                <path
                                    class="st0"
                                    d="M13.5,26.5c-7.2,0-13-5.8-13-13c0-7.2,5.8-13,13-13c7.2,0,13,5.8,13,13C26.5,20.7,20.7,26.5,13.5,26.5z
                        M13.5,1.5c-6.6,0-12,5.4-12,12c0,6.6,5.4,12,12,12c6.6,0,12-5.4,12-12C25.5,6.9,20.1,1.5,13.5,1.5z"
                                />
                            </svg>
                        </div>
                        <span class="control-text">
                            Help
                        </span>
                    </button>
                </div>
                <button
                    @click=${() => {
                        this.$$tutorial.show = true
                    }}
                    class="control-link-item help-mobile ui ${(this.$$settingsModal && this.$$settingsModal.open) ||
                    (this.$$shareModal && this.$$shareModal.open)
                        ? ' disabled'
                        : ''}"
                >
                    <div class="control-link about">
                        <svg
                            version="1.1"
                            id="Layer_1"
                            xmlns="http://www.w3.org/2000/svg"
                            xmlns:xlink="http://www.w3.org/1999/xlink"
                            x="0px"
                            y="0px"
                            viewBox="0 0 27 27"
                            style="enable-background:new 0 0 27 27;"
                            xml:space="preserve"
                        >
                            <path
                                class="st0"
                                d="M12.5,16.4c0-0.4,0-0.8,0.1-1c0-0.3,0.1-0.5,0.2-0.7c0.1-0.2,0.2-0.4,0.4-0.6c0.2-0.2,0.4-0.4,0.7-0.7
                  c0.2-0.2,0.4-0.4,0.6-0.6s0.4-0.4,0.6-0.7c0.2-0.2,0.3-0.5,0.4-0.8s0.2-0.5,0.2-0.8c0-0.6-0.2-1.1-0.6-1.5c-0.4-0.3-0.9-0.5-1.6-0.5
                  c-0.3,0-0.5,0-0.8,0.1c-0.3,0.1-0.5,0.2-0.7,0.3c-0.2,0.1-0.4,0.3-0.5,0.5c-0.1,0.2-0.2,0.5-0.2,0.8H9.7c0-0.5,0.1-0.9,0.3-1.3
                  s0.5-0.7,0.8-1c0.3-0.3,0.7-0.5,1.2-0.6C12.5,7.1,13,7,13.5,7c0.6,0,1.1,0.1,1.6,0.2c0.5,0.1,0.9,0.4,1.2,0.7s0.6,0.6,0.7,1
                  s0.3,0.9,0.3,1.4c0,0.4-0.1,0.8-0.2,1.2c-0.1,0.4-0.3,0.7-0.6,1.1c-0.2,0.3-0.5,0.6-0.8,0.9s-0.6,0.6-0.8,0.8
                  c-0.2,0.2-0.3,0.3-0.4,0.5s-0.2,0.3-0.2,0.5s-0.1,0.3-0.1,0.5c0,0.2,0,0.4,0,0.6H12.5z M12.3,19.1c0-0.3,0.1-0.5,0.3-0.7
                  s0.4-0.3,0.8-0.3s0.6,0.1,0.8,0.3s0.3,0.4,0.3,0.7c0,0.3-0.1,0.5-0.3,0.7s-0.4,0.3-0.8,0.3s-0.6-0.1-0.8-0.3S12.3,19.4,12.3,19.1z"
                            />
                            <path
                                class="st0"
                                d="M13.5,26.5c-7.2,0-13-5.8-13-13c0-7.2,5.8-13,13-13c7.2,0,13,5.8,13,13C26.5,20.7,20.7,26.5,13.5,26.5z
                    M13.5,1.5c-6.6,0-12,5.4-12,12c0,6.6,5.4,12,12,12c6.6,0,12-5.4,12-12C25.5,6.9,20.1,1.5,13.5,1.5z"
                            />
                        </svg>
                    </div>
                </button>
                <div class="control-arrows${!this.loaded ? ' disabled' : ''} ui">
                    <div class="vertical">
                        <button
                            class="up ${this.maxIn ? ' disabled' : ''}"
                            @touchstart=${this.handleZoomButton}
                            @touchend=${this.clearZoomInterval}
                            @mousedown=${this.handleZoomButton}
                            @mouseup=${this.clearZoomInterval}
                            @mouseout=${this.clearZoomInterval}
                        >
                            <svg
                                version="1.1"
                                id="Layer_1"
                                xmlns="http://www.w3.org/2000/svg"
                                xmlns:xlink="http://www.w3.org/1999/xlink"
                                x="0px"
                                y="0px"
                                viewBox="0 0 20 20"
                                style="enable-background:new 0 0 20 20;"
                                xml:space="preserve"
                            >
                                <polygon
                                    class="st0"
                                    points="20,9 11,9 11,0 9,0 9,9 0,9 0,11 9,11 9,20 11,20 11,11 20,11 "
                                />
                            </svg>
                        </button>
                        <button
                            class="down ${this.maxOut ? ' disabled' : ''}"
                            @touchstart=${this.handleZoomButton}
                            @touchend=${this.clearZoomInterval}
                            @mousedown=${this.handleZoomButton}
                            @mouseup=${this.clearZoomInterval}
                            @mouseout=${this.clearZoomInterval}
                        >
                            <svg
                                version="1.1"
                                id="Layer_1"
                                xmlns="http://www.w3.org/2000/svg"
                                xmlns:xlink="http://www.w3.org/1999/xlink"
                                x="0px"
                                y="0px"
                                viewBox="0 0 20 2"
                                style="enable-background:new 0 0 20 2;"
                                xml:space="preserve"
                            >
                                <rect class="st0" width="20" height="2" />
                            </svg>
                        </button>
                    </div>
                </div>
                <div id="audio-loading" class="${this.audioLoading ? 'show' : ''}">
                    <div class="circle-container">
                        <div class="circle">
                            <svg class="circular-loader" viewBox="0 0 50 50">
                                <circle class="loader-path" cx="25" cy="25" r="20" fill="none" stroke-width="7" />
                            </svg>
                        </div>
                    </div>
                    <span style="${Device.mobile ? 'display: none;' : ''}">Loading audio</span>
                </div>
                <comment-el class="${!this.loaded ? 'disabled' : ''} ui"></comment-el>
                <info-bubble></info-bubble>
                ${this.showiOSNotice
                    ? html`
                          <div class="ios-silent">
                              Heads up — if you have your iOS device in Silent Mode, audio playback is affected.
                          </div>
                      `
                    : ''}
                <annotate-el
                    @annotate=${this.saveAnnotation}
                    class="${this.disableAnnotate ? 'hidden' : ''}"
                ></annotate-el>
                <intro-element class="${this.disableIntro ? 'hidden' : ''}"></intro-element>
            </div>
        `
    }
}

export function setControlsPosition(time) {
    if (Globals.controls && Globals.currentLocation && time >= 0) {
        let position = Globals.controls.position
        // set position based on a % of current location total duration
        if (time <= 1) {
            position = time * Globals.currentLocation.duration
        } else {
            // set position based on epoch timestamp
            position = time - Globals.currentLocation.startTime
        }
        Globals.controls.position = position
    }
}
window.setControlsPosition = setControlsPosition

export function setControlsDuration(duration) {
    if (Globals.controls && Globals.currentLocation && duration >= 0) {
        // const duration = Globals.controls.duration
        // console.log(duration)
        Globals.controls.linearScale = getLogPosition(
            duration,
            parseFloat(Config.minDuration),
            parseFloat(Config.maxDuration)
        )
        Globals.controls.duration = duration
    }
}

export function getControlsInfo() {
    return {
        time_stamp: Globals.player.time,
        position: Globals.player.time - Globals.player.startTime,
        duration: Globals.spectrogram.duration,
        location: Globals.spectrogram.location,
        zoom: 1 - Globals.controls.duration / parseFloat(Config.maxDuration),
    }
}
