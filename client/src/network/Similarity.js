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

export class Similarity {
    constructor(location, startTime) {
        this._imageDataMap = new Map()
        // this._tiles = new Tiles(location, startTime)
    }

    async getSimilarity(windowStart, windowEnd) {
        const centerPoint = (windowStart + windowEnd) / 2
        const offset = (centerPoint - imageStartTime) / imageHeightDuration
        const imageData = await this._getImageData()
        const data = this._getTimeOffset(imageData, offset, centerPoint)
        return data
    }

    async _getImageData(url) {
        // const url = '/assets/similarity-221-raw.png'
        if (this._imageDataMap.has(url)) {
            return this._imageDataMap.get(url)
        } else {
            const image = new Image()
            image.src = url
            await new Promise((done) => (image.onload = () => done()))
            const canvas = document.createElement('canvas')
            canvas.width = image.width
            canvas.height = image.height
            const context = canvas.getContext('2d')
            context.drawImage(image, 0, 0, image.width, image.height)
            const imageData = context.getImageData(0, 0, image.width, image.height)
            //create the 2d matrix with all the data
            const matrix = []
            for (let row = 0; row < imageData.height; row++) {
                //get the image data for that row
                const startIndex = row * imageData.width * 4
                const pixelRow = imageData.data.subarray(startIndex, startIndex + imageData.width * 4)
                //just take the first value of the RGBA
                // const subarray = new Float32Array(imageData.width)
                const subarray = []
                for (let i = 0; i < pixelRow.length; i += 4) {
                    subarray.push(pixelRow[i] / 255)
                }
                matrix.push(subarray.reverse())
            }

            const matrixData = {
                data: matrix,
                width: imageData.width,
                height: imageData.height,
            }

            this._imageDataMap.set(url, matrixData)

            return matrixData
        }
    }

    _getTimeOffset(imageData, offset) {
        //the y row as a percentage of the total time
        const { width, height } = imageData
        const percentageHeight = height * offset
        const row = Math.floor(percentageHeight)
        const pixelOffset = percentageHeight - row

        if (offset > 1 || offset < 0 || isNaN(row)) {
            return []
        }

        const subarray = imageData.data[row]

        if (!this.currentRow) {
            this.currentRow = subarray
        } else {
            //average the two together
            const alpha = 0.8
            this.currentRow = this.currentRow.map((val, index) => val * alpha + subarray[index] * (1 - alpha))
        }

        const offsetTime = offset * imageHeightDuration + imageStartTime
        const threshValue = config.threshold

        const retTimes = []
        let active = null
        const rowTime = (row / height) * imageHeightDuration
        subarray.forEach((value, index) => {
            const indexTime = ((index - pixelOffset) / width - 0.5) * imageWidthDuration + offsetTime
            if (value > threshValue && !active) {
                active = {
                    startTime: indexTime,
                    duration: 0,
                    value,
                }
                retTimes.push(active)
            } else if (value <= threshValue && active) {
                active.duration = indexTime - active.startTime
                active = null
            } else if (active) {
                //take the max value within the thresh'ed area
                active.value = Math.max(active.value, value)
            }
        })
        return retTimes
    }
}
