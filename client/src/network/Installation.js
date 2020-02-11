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

import io from 'socket.io-client'
import { Globals, Config } from '../globals'
import { getControlsInfo, setControlsDuration, setControlsPosition } from '../ui/Controls'
import LowpassFilter from '../util/LowpassFilter'
import { scaleToRange, logScale, clamp } from '../util/Math'

/**
 * The IP Address of the device
 */
const SENSOR_IP_PORT = '192.168.86.83:8080'

/**
 * The threshold that needs to be crossed before a movement is triggered
 */
const MOVEMENT_DELTA = 0.01
// const MOVEMENT_DELTA = 22321

/**
 * The start time of the strip in UNIX time
 */
const DATE_START = 1422755085000

/**
 * The end time of the strip in UNIX time
 */
const DATE_END = 1425163823000

/**
 * the sensor value at the start
 */
const SENSOR_START = 3.5

/**
 * The sensor value at the end of the strip
 */
const SENSOR_END = 0.5

const MIN_ZOOM = Config.minDuration * 8
const MAX_ZOOM = Config.maxDuration / 32

// BEGIN MOVEMENT CODE

let loaded = false

const loadedPromise = new Promise((done) => {
    const interval = setInterval(() => {
        if (Globals.player) {
            clearInterval(interval)
            done()
        }
    }, 100)
})

loadedPromise.then(() => (loaded = true))

let lastPosition = 0
let lastZoom = MIN_ZOOM

const positionFilter = new LowpassFilter(0.02, 0.6)
const zoomFilter = new LowpassFilter(0.015, 0.55)
let moveToTime = 0

setInterval(() => {
    // const speed = Math.abs(v - lastPosition)
    const speed = moveToTime - lastPosition

    // Calculate the max speed. Max speed is the width of the current view, so slow down when zoomed in
    const maxSpeed = lastZoom * 4
    const clampedSpeed = clamp(speed, -maxSpeed, maxSpeed)

    // Move to the new position at the clamped speed
    let pos = lastPosition
    if (Math.abs(clampedSpeed) > 100000) {
        pos = positionFilter.tick(lastPosition + clampedSpeed)
        setControlsPosition(pos)
    }

    // Calculate desired zoom level
    let zoom = MAX_ZOOM
    if (Math.abs(speed) < 100000) {
        zoom = MIN_ZOOM
    }

    const z = clamp(zoomFilter.tick(zoom), MIN_ZOOM, MAX_ZOOM)
    setControlsDuration(z)

    lastPosition = pos
    lastZoom = z
}, 30)

const socket = io(`http://${SENSOR_IP_PORT}`)
socket.on('connect', (e) => {
    console.log('connected!')
})

let lastSensorValue = 0
socket.on('change', (sensor) => {
    if (Math.abs(sensor - lastSensorValue) > MOVEMENT_DELTA) {
        console.log('sensor', sensor)
        const first = moveToTime == 0
        moveToTime = (sensor / (SENSOR_END - SENSOR_START)) * (DATE_END - DATE_START) + DATE_START
        if (first) {
            for (let i = 0; i < 1000; i++) {
                lastPosition = positionFilter.tick(moveToTime)
            }
        }
        lastSensorValue = sensor
    }
})
