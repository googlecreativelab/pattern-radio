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
import { distance, clamp } from '../util/Math'

const easing = 0.075

export class Scrub {
    constructor($$element) {
        this.$$canvas = $$element
        this.$$canvas.addEventListener('mousedown', this.mouseDown.bind(this))
        this.$$canvas.addEventListener('mouseup', this.mouseUp.bind(this))
        this.$$canvas.addEventListener('mousemove', this.mouseMove.bind(this))
        this.$$canvas.addEventListener('touchstart', this.touchStart.bind(this))
        this.$$canvas.addEventListener('touchend', this.touchEnd.bind(this))
        this.$$canvas.addEventListener('touchmove', this.touchMove.bind(this))
        this.$$canvas.addEventListener('dblclick', this.dblclick.bind(this))

        this.$$canvas.addEventListener('wheel', (event) => {
            Globals.events.emit('wheel')
            if (this.touchStarted) return
            event.preventDefault()
            if (this.pinching) return

            if (event.deltaY) {
                this.mouseWheelVertical(event)
            }
            if (event.deltaX) {
                this.mouseWheelHorizontal(event)
            }
        })

        // This makes safari work....
        window.addEventListener('wheel', () => {
            return true
        })

        this.zoomAmt = this.prevZoomAmt = 0
        this.scrubAmt = this.prevScrubAmt = 0
        this.minScrubDuration = 1
        this.minZoomDuration = 2
        this.handlingPinchMomentum = false
        this.handlingScrubMomentum = false
    }

    touchStart(event) {
        this.touchStarted = true
        if (this.pinching || this.handlingPinchMomentum) {
            this.pinchStop()
        }
        if (this.moving || this.handlingScrubMomentum) {
            this.dragStop()
        }
        if (event.touches && event.touches.length === 1) {
            this.dragStart(event.touches[0].clientX)
        } else if (event.touches && event.touches.length > 1) {
            this.pinching = true
            this.initialDistance = distance(
                event.touches[0].clientX,
                event.touches[0].clientY,
                event.touches[1].clientX,
                event.touches[1].clientY
            )
            Globals.events.emit('pinchStart')
        }
    }

    touchEnd(event) {
        this.touchStarted = false
        if (this.pinching) {
            this.zoomMomentum = this.zoomAmt - this.prevZoomAmt
            if (Math.abs(this.zoomMomentum) <= this.minZoomDuration) {
                this.pinchStop()
            }
        }
        if (this.moving) {
            this.scrubMomentum = this.scrubAmt - this.prevScrubAmt
            if (this.scrubMomentum === 0) {
                this.dragStop()
            }
        }
    }

    touchMove(event) {
        if (this.pinching && event.touches && event.touches[0] && event.touches[1]) {
            const touchDistance = distance(
                event.touches[0].clientX,
                event.touches[0].clientY,
                event.touches[1].clientX,
                event.touches[1].clientY
            )
            const differentDistance = touchDistance - this.initialDistance

            this.prevZoomAmt = this.zoomAmt
            this.zoomAmt = differentDistance
            if (!this.initializePinching) {
                this.prevZoomAmt = this.zoomAmt
                this.initializePinching = true
            }
            if (!Number.isNaN(differentDistance)) {
                this.doPinch(differentDistance)
            }
            return
        }
        if (this.moving && event.touches && event.touches[0] && this.startPos) {
            this.scrub(event.touches[0].clientX, this.startPos)
        }
    }

    dblclick(event) {
        if (Globals.spectrogram.mouseHover) {
            const duration = clamp(Globals.controls.duration * 0.5, Config.minDuration, Config.maxDuration)
            Globals.controls.tweens.linearDuration
                .stop()
                .to({ duration }, 200)
                .start()

            this.dbclickHappened = true
        }
    }

    dragStart(x) {
        this.startPos = x
        this.dragStartTime = Globals.player.time
        this.moving = true
        Globals.events.emit('dragStart')
    }

    dragStop() {
        this.moving = false
        this.handlingScrubMomentum = false
        this.initializeScrubbing = false
        this.scrubMomentum = 0
        Globals.events.emit('dragStop')
    }

    doPinch(distance) {
        Globals.events.emit('pinch', {
            detail: {
                distance,
            },
        })
    }

    pinchStop() {
        this.pinching = false
        this.handlingPinchMomentum = false
        this.initializePinching = false
        this.zoomMomentum = 0
    }

    mouseDown(event) {
        this.scrubbing = false
        Globals.spectrogram.container.cursor = 'grab'
        this.dragStart(event.clientX)
    }

    mouseUp(event) {
        this.dbclickHappened = false

        if (!this.scrubbing && Globals.spectrogram.mouseHover) {
            setTimeout(() => {
                if (!this.dbclickHappened) {
                    const time = Globals.timeManager.pxToTime(event.clientX)
                    Globals.controls.tweens.position
                        .stop()
                        .to({ position: time - Globals.currentLocation.startTime }, 200)
                        .start()
                }
            }, 1)
        }

        Globals.spectrogram.container.cursor = 'pointer'
        this.dragStop()
    }

    mouseMove(event) {
        if (this.moving && !this.touchStarted) {
            this.scrubbing = true
            this.scrub(event.clientX, this.startPos)
        }
    }

    scrub(end, start) {
        const distance = -(end - start)

        const curTime = Globals.timeManager.currentTime
        const nextTime = Globals.timeManager.pxToTime(window.innerWidth / 2 + distance)
        let duration = nextTime - curTime

        // for handling touch momentum
        if (this.touchStarted) {
            this.prevScrubAmt = this.scrubAmt
            this.scrubAmt = distance
            if (!this.initializeScrubbing) {
                this.prevScrubAmt = this.scrubAmt
                this.initializeScrubbing = true
            }
        }

        Globals.events.emit('move', {
            detail: { distance: duration },
        })

        this.startPos = end
    }

    mouseWheelHorizontal(event) {
        const distance = event.deltaX

        const curTime = Globals.timeManager.currentTime
        const nextTime = Globals.timeManager.pxToTime(window.innerWidth / 2 + distance)
        let duration = nextTime - curTime

        Globals.events.emit('move', {
            detail: { distance: duration },
        })
    }

    mouseWheelVertical(event) {
        Globals.events.emit('verticalScroll', {
            detail: { deltaY: event.deltaY },
        })
    }

    handleMomentum() {
        if (this.touchStarted) {
            if (this.pinching) {
                this.prevZoomAmt = this.zoomAmt
            }
            if (this.moving) {
                this.prevScrubAmt = this.scrubAmt
            }
        } else {
            if (this.zoomMomentum) {
                this.handlingPinchMomentum = true
                this.zoomAmt += this.zoomMomentum
                this.doPinch(this.zoomAmt)
                this.zoomMomentum =
                    Math.abs(this.zoomMomentum) < this.minZoomDuration
                        ? 0
                        : this.zoomMomentum - this.zoomMomentum * easing
            } else {
                if (this.pinching && this.handlingPinchMomentum) {
                    this.pinchStop()
                }
            }
            if (this.scrubMomentum) {
                this.handlingScrubMomentum = true
                this.scrubAmt -= this.scrubAmt * easing
                if (Math.abs(this.scrubAmt) < this.minScrubDuration) {
                    this.dragStop()
                } else {
                    this.scrub(this.startPos - this.scrubAmt, this.startPos)
                }
            }
        }
    }
}
