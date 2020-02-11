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

import Tone, { Buffer, BufferSource } from 'tone'
import { audioOutput } from './AudioOutput'

const playingAudio = []

/**
 *
 * const audio = new Audio('https://path/to/file.mp3', 1423823918750)
 *
 * audio.sync(time: ms, playing: boolean, duration: (length of segment))
 * Audio.testStops(this.time)
 *
 */

export class Audio {
    /**
     * Stops audio in playingAudio array
     * from playing.
     *
     * @param {number} time - takes an epoch
     *
     * playingAudio is a singleton cache of new Audio()s
     *
     * This needs to be called on each frame
     */
    static testStops(time) {
        playingAudio.forEach((audio) => {
            const offset = time - audio.startTime
            if (audio.playing && (0 > offset || offset > audio._audioElement.duration * 1000)) {
                audio._stopAudio()
            }
        })
    }

    /**
     * new Audio(filename, this.startTime)
     *
     * @param {string} url - path to audio file
     * @param {int} startTime - timestamp in ms
     */
    constructor(url, startTime) {
        this._url = url
        this.playing = false
        this.loaded = false
        this.loading = false
        this.startTime = startTime
    }

    get url() {
        return this._url
    }

    _effectsChain() {
        const source = Tone.context.createMediaElementSource(this._audioElement)
        Tone.connect(source, audioOutput)
    }

    async load() {
        this.loading = true
        // this._audioElement = document.createElement('audio')

        const src = `https://storage.googleapis.com/deepblue-transcoded-audio/${this._url}`

        // this._audioElement.src =
        // this._audioElement.crossOrigin = 'anonymous'
        this._buffer = await Buffer.fromUrl(src)

        // console.timeEnd('loading')

        // this._effectsChain()
        // this._audioElement.load()
        // await new Promise((done) =>
        //     this._audioElement.addEventListener('canplay', () => done())
        // )
        this.loaded = true
        this.loading = false
    }

    pause() {
        if (this._source && this._source.state !== 'stopped') {
            this._source.stop()
        }
        this._source = null
        this.playing = false
    }

    _stopAudio() {
        this.pause()
        const index = playingAudio.indexOf(this)
        if (index !== -1) {
            playingAudio.splice(index, 1)
        }
        this.playing = false
    }

    async sync(time, playing) {
        const duration = time + 30000
        const offset = time - this.startTime
        // load if its offset is less than 30 seconds away
        const shouldLoad = Math.abs(offset) < duration * 1.5
        if (!this.loaded && !this.loading && shouldLoad) {
            await this.load()
            return
        }
        if (!this.loaded || this._syncing) {
            return
        }

        this._syncing = true

        if (0 <= offset && offset <= this._buffer.duration * 1000) {
            if (!this.playing && playing) {
                this._source = new BufferSource({
                    buffer: this._buffer,
                    fadeIn: 0.01,
                    fadeOut: 0.4,
                    onended() {
                        this._source = null
                    },
                }).connect(audioOutput)
                this._source.start(Tone.now(), offset / 1000).toMaster()
                playingAudio.push(this)
                this.playing = true
            }
        } else if (this.playing) {
            this._stopAudio()
        }

        this._syncing = false
    }

    dispose() {
        this._stopAudio()
    }
}
