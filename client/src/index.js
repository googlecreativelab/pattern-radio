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

// import './generate/Generator'
import { Controls } from './ui/Controls'
import { Canvas } from './ui/Canvas'
import { LocationPicker } from './ui/LocationPicker'
import { Loader } from './ui/Loader'
import { TimeSlider } from './ui/TimeSlider'
import { Intro } from './ui/Intro'
import { Config, Globals } from './globals'
import { LocationsModel } from './models/Locations'
import './export/Audio'
import './style.scss'
import { TimeManager } from './models/TimeManager'

// import './network/Installation'

customElements.define('controls-element', Controls)
customElements.define('canvas-element', Canvas)
customElements.define('location-picker-element', LocationPicker)
customElements.define('loader-element', Loader)
customElements.define('intro-element', Intro)

//const Locations = {}

async function main() {
    const $$body = document.querySelector('body')
    Globals.timeManager = new TimeManager()
    const $$controls = (Globals.controls = document.createElement('controls-element'))
    // const $$locationPicker = document.createElement('location-picker-element')
    // $$locationPicker.default = Config.defaultLocation
    $$body.appendChild($$controls)
    //$$body.appendChild($$locationPicker)
    // $$locationPicker.locations = await LocationsModel.getLocationsData()
    $$controls.location = await LocationsModel.get(Config.defaultLocation)
    // $$locationPicker.addEventListener('change', async event => {
    //     $$controls.location = await LocationsModel.get(event.detail.value)
    // })
}
var hasTouched = false
document.body.addEventListener('touchstart', () => {
    if (!hasTouched) {
        hasTouched = true
        document.body.classList.add('touch-device')
    }
})

main()

window.addEventListener('keydown', (e) => {
    // Prevent space bar from clicking any of the buttons
    if (e.keyCode === 32) {
        e.preventDefault()
    }
})
