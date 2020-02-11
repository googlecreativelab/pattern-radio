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
import { Config } from '../globals'

export class InfoBubble extends LitElement {
    static get properties() {
        return {
            author: { type: String },
            authorObj: { type: Object },
            open: { type: Boolean },
            text: { type: String },
        }
    }

    static get styles() {
        return css`
            #container {
                pointer-events: none;
                position: absolute;
                z-index: 55;
                display: flex;
                justify-content: row;
                border: 1px solid #fff;
                padding: 12px 18px;
                color: #fff;
                height: fit-content;
                align-items: center;
                background: black;
                max-width: 450px;
                opacity: 0;
                margin-top: 0px;
                transition: opacity 0.15s ease-out 0, margin 0.25s ease-out 0;
            }

            #container.visible {
                margin-top: -5px;
                opacity: 1;
                visibility: visible;
                transition: opacity 0.25s ease-out, margin 0.25s ease-out 0s;
            }

            .info-bubble-image {
                width: 34px;
                height: 34px;
                object-fit: cover;
                border-radius: 50%;
                border: 1px solid #bbffff;
                margin-right: 14px;
            }

            .info-bubble-name {
                font-family: 'Roboto Mono', monospace;
                letter-spacing: 1px;
                font-size: 14px;
                margin: 0;
                font-weight: 500;
            }

            .info-bubble-title {
                font-family: 'Roboto Mono', monospace;
                margin-top: 2px;
                font-size: 12px;
                letter-spacing: 1.67;
                margin: 0 0 7px 0;
            }
        `
    }

    constructor() {
        super()
        this._coords = {
            x: 0,
            y: 0,
        }

        this.containerHeight = 68
    }

    set author(author) {
        this._author = author
        if (this.author !== null) {
            this.authorObj = Config.authors[this.author]
            this.open = true
        } else {
            this.authorObj = null
            this.open = false
        }
    }

    set text(text) {
        this.authorObj = null
        this._text = text
        this.open = true
    }

    firstUpdated() {
        this.$$container = this.shadowRoot.querySelector('#container')
    }

    get author() {
        return this._author
    }

    set coords(coords) {
        this._coords = coords
        this.requestUpdate()
    }

    get coords() {
        return this._coords
    }

    render() {
        let content = html``
        if (this.authorObj) {
            content = html`
                <img class="info-bubble-image" src=${this.authorObj.image} />
                <div class="info-bubble-text">
                    <p class="info-bubble-name">${this.authorObj.name}</p>
                    <p class="info-bubble-title">${this.authorObj.title}</p>
                </div>
            `
        } else if (this._text) {
            content = html`
                <div class="info-bubble-text">
                    <p class="info-bubble-name">${this._text}</p>
                </div>
            `
        }
        return html`
            <div
                class="info-bubble ${this.open ? 'visible' : ''}"
                id="container"
                style="transform: translate(${this.coords.x}px, ${this.coords.y}px);"
            >
                ${content}
            </div>
        `
    }
}
customElements.define('info-bubble', InfoBubble)
