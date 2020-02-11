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

import { GUI } from '../ui/Dat'

const config = {
    threshold: 0.03,
    alpha: 0.9,
    scaling: 2,
    offsetTime: 0,
    offsetPixels: 0,
}

if (GUI) {
    GUI.add(config, 'threshold', 0, 1).name('sim thresh')
    GUI.add(config, 'alpha', 0, 1).name('sim smoothing')
    GUI.add(config, 'scaling', 0.1, 3).name('sim scaling')
    GUI.add(config, 'offsetTime', -2000, 2000).name('sim offset')
    GUI.add(config, 'offsetPixels', -10, 10).name('offset px')
}

export class SimilarityTile {
    constructor(url, startTime, duration) {
        this._url = url
        this.startTime = startTime
        this.duration = duration
        this.touched = new Date()
        this.loaded = false
        this.loading = false
        this.load()
    }

    async load() {
        if (this.loading) {
            return
        }
        this.loading = true

        const image = new Image()
        image.crossOrigin = 'anonymous'
        image.src = this._url
        try {
            await new Promise((done, error) => {
                image.onload = done
                image.onerror = error
            })
        } catch (e) {
            return
        }

        const canvas = document.createElement('canvas')
        canvas.width = image.width
        canvas.height = image.height
        const context = canvas.getContext('2d')
        context.drawImage(image, 0, 0, image.width, image.height)
        const imageData = context.getImageData(0, 0, image.width, image.height)
        // create the 2d matrix with all the data
        const matrix = []
        for (let column = 0; column < imageData.width; column++) {
            const subarray = []
            for (let row = 0; row < imageData.height; row++) {
                const index = row * imageData.width * 4 + column * 4
                subarray.push(imageData.data[index] / 255)
            }
            matrix.push(subarray)
        }

        this.imageData = {
            data: matrix,
            // the matrix has been rotated
            width: imageData.height,
            height: imageData.width,
        }

        this._generateAverage()

        this.loaded = true
        this.loading = false
    }

    _generateAverage() {
        // const centerColumnIndex = Math.floor(0.5 * this.imageData.width)
        const averageColumn = this.imageData.data.map((row) => {
            // return Math.max(...row)
            return (row.reduce((a, b) => a + b, 0) / row.length) * 100
        })

        const tickDuration = (1 / averageColumn.length) * this.duration
        this.averageColumn = averageColumn.map((value, index) => {
            const rowTime = (index / averageColumn.length) * this.duration + this.startTime
            return {
                value,
                startTime: rowTime,
                duration: tickDuration,
            }
        })
    }

    _getTimeOffset(offset) {
        // the y row as a percentage of the total time
        const { width, height } = this.imageData
        const percentageHeight = height * offset
        const row = Math.floor(percentageHeight)
        // const pixelOffset = percentageHeight - row
        const pixelOffset = percentageHeight - row

        if (offset > 1 || offset < 0 || isNaN(row) || !this.loaded) {
            return []
        }

        const offsetPixels = Math.floor(config.offsetPixels)
        const subarray = this.imageData.data[row + offsetPixels]
        const nextRow = this.imageData.data[row + offsetPixels + 1]

        if (!subarray || !nextRow) {
            return []
        }
        //interpolate between the two rows using the pixel offset
        const resultingArray = subarray.map((value, index) => {
            return pixelOffset * nextRow[index] + (1 - pixelOffset) * value
        })

        this.currentRow = resultingArray

        const imageHeightDuration = this.duration
        const imageWidthDuration = this.duration * (width / height)
        // const imageWidthDuration = 120000

        const offsetTime = offset * imageHeightDuration + this.startTime
        // const threshValue = config.threshold

        const tickDuration = (1 / this.currentRow.length) * imageWidthDuration
        const retTimes = this.currentRow.map((value, index) => {
            // const indexTime = (((index - pixelOffset - 1) / width) - 0.5) * imageWidthDuration + offsetTime
            const indexTime = ((index - 1) / width - 0.5) * imageWidthDuration + offsetTime
            return {
                startTime: indexTime + tickDuration,
                duration: tickDuration,
                value: Math.pow(value, config.scaling),
            }
        })
        return retTimes
    }

    getSimilarity(windowStart, windowEnd) {
        if (!this.loaded) {
            return []
        }
        const centerPoint = (windowStart + windowEnd) / 2
        const offset = (centerPoint - this.startTime) / this.duration
        const data = this._getTimeOffset(offset)
        return data
    }

    getAverage() {
        if (!this.loaded) {
            return []
        }
        return this.averageColumn
    }
}
