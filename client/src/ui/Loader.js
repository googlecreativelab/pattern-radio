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

export class Loader extends LitElement {
    static get properties() {
        return {
            background: { type: Boolean },
        }
    }
    static get styles() {
        return css`
            #container {
                width: 100vw;
                height: 100vh;
                position: fixed;
                left: 0;
                top: 0;
                color: white;
                text-align: center;
                transition: opacity 0.5s ease-out;
                display: none;
            }

            .bg {
                background: black;
            }

            #container.active {
                display: block;
            }

            .circle {
                width: 10vw;
                height: 10vw;
                position: relative;
                left: 50%;
                top: 50%;
                transform: translate(-50%, -50%);
                min-height: 60px;
                min-width: 60px;
                max-height: 120px;
                max-width: 120px;
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
                stroke: #808080;
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
        `
    }

    constructor() {
        super()
        this.showing = true
    }
    show() {
        this.showing = true
        this.requestUpdate()
    }

    hide() {
        this.showing = false
        this.requestUpdate()
    }

    render() {
        console.log(this.background)

        return html`
            <div id="container" class="${this.showing ? 'active' : ''} ${this.background ? 'bg' : ''}">
                <div class="circle">
                    <svg class="circular-loader" viewBox="0 0 50 50">
                        <circle class="loader-path" cx="25" cy="25" r="20" fill="none" stroke-width="3" />
                    </svg>
                </div>
            </div>
        `
    }
}
