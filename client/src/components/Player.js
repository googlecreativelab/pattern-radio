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

import { LocationsModel } from '../models/Locations'
import { Audio } from './Audio'
import { Globals } from '../globals'

/**
 * Moved from Spectrogram
 */
export class Player {
    constructor(location, startTime) {
        /**
         * The location of this player
         */
        this.setLocation(location)

        /**
         * the current file's start time
         */
        this._startTime = startTime

        /**
         * The realtime offset between the playhead and Date.now()
         */
        this._realTimeStart = 0

        this._hasInit = false

        this.currentFiles = []

        this._currentFilename = ''

        this.buffering = false

        this.playingWithoutAudio = false

        /**
         * Kick off the synchronization loop
         */
        setInterval(this._sync.bind(this), 300)
    }

    async setLocation(location) {
        // if (this._spectrogramTiles) {
        //     this._spectrogramTiles.dispose()
        // }
        this._location = location
        this.locationModel = await LocationsModel.get(location)
        await this._fetchFiles()
    }

    get location() {
        return this._location
    }

    get startTime() {
        return this.locationModel.startTime
    }

    get currentFilename() {
        let currentFilename = ''
        this.currentFiles.forEach((file) => {
            if (file.audio && file.audio.playing) {
                currentFilename = file.audio.url
            }
        })
        return currentFilename
    }

    start() {
        this._realTimeStart = Date.now()
    }

    pause() {
        this.currentFiles.forEach((file) => {
            if (file.audio) {
                file.audio.pause()
            }
        })
        this._startTime = this.time
        this._realTimeStart = 0
    }

    _sync() {
        if (!Globals.isScrubbing) {
            this._fetchFiles()
        }
    }

    audioLoop() {
        if (!Globals.isScrubbing) {
            this.currentFiles.forEach((file) => {
                if (file.audio) {
                    file.audio.sync(this.time, this.playing)
                }
            })
        }
        const anyPlaying = this.currentFiles.some((f) => f.audio.playing)
        const anyLoading = this.currentFiles.some((f) => f.audio.loading)
        const buffering = this.playing && anyLoading && !anyPlaying
        this.playingWithoutAudio = this.playing && !anyPlaying
        if (buffering !== this.buffering) {
            this.buffering = buffering
            if (!buffering) {
                Globals.controls.showAudioLoading = false
            }
        }
        if (anyPlaying && Globals.controls.showAudioLoading) {
            Globals.controls.showAudioLoading = false
        }
        if (this.playing) {
            const thisGap = Globals.timeManager.getGap(this.time)
            if (thisGap) {
                this.pause()
                Globals.controls.tweens.position
                    .stop()
                    .to(
                        {
                            position: thisGap.timeEnd - Globals.currentLocation.startTime,
                        },
                        750
                    )
                    .start()
            }
        }
    }

    async _fetchFiles() {
        if (!this.locationModel || this.fetchingFiles) return
        this.loading = true
        this.currentFiles.forEach((file) => {
            file.remove = true
        })
        this.fetchingFiles = true
        let files
        try {
            files = await this.locationModel.getFiles(this.time)
            this.fetchingFiles = false
        } catch (err) {
            console.log('file error', err)
            this.fetchingFiles = false
        }

        if (!this._hasInit) {
            // TODO: if we switch locations,
            // we need to empty this array
            // and delete the items
            this.currentFiles = []
            this._hasInit = true
        }

        if (files.length > 0) {
            files.forEach((file) => {
                const matchedFiles = this.currentFiles.filter((f) => f.filename === file.filename)

                if (matchedFiles.length > 0) {
                    // let's loop just in case there are
                    // more than one
                    matchedFiles.forEach((mf) => {
                        mf.remove = false
                    })
                } else {
                    file.audio = new Audio(file.filename, file.startTime)
                    this.currentFiles.push(file)
                    file.remove = false
                }
            })
            this.currentFiles.forEach((item, index) => {
                if (item.remove) {
                    item.audio.dispose()
                    delete this.currentFiles[index]
                }
            })
        } else {
            // Stop player if no files have been found to play
            if (Globals.player.playing) {
                this.pause()
                Globals.controls.$$playButton.style.display = 'flex'
                Globals.controls.$$pause.style.display = 'none'
                Globals.controls.playing = false
            }
        }
    }

    get time() {
        if (this._realTimeStart > 0) {
            return Date.now() - (this._realTimeStart - this._startTime)
        } else {
            return this._startTime
        }
    }

    set time(time) {
        this._startTime = time
    }

    get playing() {
        return this._realTimeStart > 0
    }
}
