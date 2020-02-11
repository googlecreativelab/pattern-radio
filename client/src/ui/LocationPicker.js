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

export class LocationPicker extends LitElement {
    static get styles() {
        return css`
            #location-group {
                color: white;
            }

            .offscreen {
                position: absolute;
                left: -10000px;
                top: auto;
                width: 1px;
                height: 1px;
                overflow: hidden;
            }
        `
    }

    constructor() {
        super()
        this._locations = []
    }

    set locations(locations) {
        this._locations = locations
        this.requestUpdate()
    }

    get locations() {
        return this._locations
    }

    firstUpdated() {
        this.$$location = this.shadowRoot.querySelector('#location')
        this.$$location.addEventListener('change', (event) => {
            const value = this.$$location[this.$$location.selectedIndex].value
            this.dispatchEvent(
                new CustomEvent('change', { detail: { value: value } })
            )
        })
    }

    render() {
        return html`
            <div id="location-group">
                <label for="location" class="offscreen">Location:</label>
                <select id="location">
                    ${
    this.locations.map((item) => {
        return html`
                                <option
                                    ?selected=${item.location === this.default}
                                    >${item.location}</option
                                >
                            `
    })
}
                </select>
            </div>
        `
    }
}
