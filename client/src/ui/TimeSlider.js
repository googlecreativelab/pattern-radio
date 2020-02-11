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
import { clamp, scaleToRange } from '../util/Math'
import * as d3TimeFormat from 'd3-time-format'

const timeFormat = d3TimeFormat.utcFormat('%b %d %Y %H:%M')
export class TimeSlider extends LitElement {
    static get properties() {
        return {
            value: { type: Number },
            min: { type: Number },
            scale: { type: Number },
            max: { type: Number },
            date: { type: Number },
        }
    }

    static get styles() {
        return css`
            :host {
                display: block;
                width: 100%;
            }

            #position-container {
                margin-top: 8px;
                margin: 0 26px;
                position: absolute;
                width: calc(100% - 26px - 26px);
                /* box-sizing: border-box; */
            }

            #position {
                -webkit-appearance: none;
                height: 1px;
                background: white;
                outline: none;
                width: 100%;
                margin: 0;
                cursor: pointer;
            }

            #position::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                min-width: 40px;
                height: 10px;
                background: white;
            }
            #position::-moz-range-thumb {
                min-width: 40px;
                height: 10px;
                background: white;
                border-radius: 0;
            }

            #position::-moz-focus-outer {
                border: 0;
            }

            #position-tooltip {
                position: absolute;
                width: 200px;
                height: 30px;
                /* background-color: red;             */
                margin-left: -100px;
                text-align: center;
                color: white;
                padding-top: 4px;
                font-size: 0.7em;
                opacity: 0;
                transition: opacity 0.25s ease-in-out;
            }

            #position-container:hover #position-tooltip {
                opacity: 1;
            }
        `
    }

    constructor() {
        super()
    }

    update(changedProperties) {
        super.update(changedProperties)
        for (const key of changedProperties.keys()) {
            switch (key) {
                case 'value':
                    if (this.$$position) {
                        this.$$position.value = this.value
                    }
                    break
            }
        }

        if (this.$$tooltip) {
            let pct = (this.value - this.min) / (this.max - this.min)

            let thumbWidth = this.$$position.offsetWidth * this.scale * 10
            thumbWidth = clamp(thumbWidth, 20, thumbWidth)
            thumbWidth = thumbWidth / this.$$position.offsetWidth
            pct = scaleToRange(pct, 0, 1, thumbWidth / 2, 1 - thumbWidth / 2)
            this.$$tooltip.style.left = `${100 * pct}%`

            const date = new Date(this.date)
            this.$$tooltip.innerText = timeFormat(date)
        }
    }

    firstUpdated() {
        this.$$tooltip = this.shadowRoot.getElementById('position-tooltip')
        this.$$position = this.shadowRoot.querySelector('#position')
        this.$$position.addEventListener('input', (event) => {
            this.value = this.$$position.value
            this.dispatchEvent(new CustomEvent('input', event))
        })
    }

    render() {
        return html`
            <style>
                #position::-webkit-slider-thumb {
                    width: ${this.scale * 1000}%;
                }
                #position::-moz-range-thumb {
                    width: ${this.scale * 1000}%;
                }
            </style>
            <div id="position-container">
                <input id="position" type="range" min=${this.min} max=${this.max} />
                <div id="position-tooltip"></div>
            </div>
        `
    }
}
customElements.define('time-slider-element', TimeSlider)
