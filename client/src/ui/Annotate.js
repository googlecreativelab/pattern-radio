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
import { Config, Device } from '../globals'

export class Annotate extends LitElement {
    static get properties() {
        return {
            isOn: { type: Boolean },
        }
    }
    static get styles() {
        return css`
        :host {
            width: 100vh;
            height: 100vh;
        }
        #container {
            display: block;
            width: 100%;
            height: 100%;
            z-index: 50;
            position: absolute;
            left: 0;
            background: rgba(0,0,0,0.5);
            top: 0;
            cursor: text;
            display: none;
        }
        #selection {
            pointer-events: none;
            background-color: #86bcbc;
            opacity: 0.3;
            position: absolute;
            height: 400px;
            opacity: 0;
            top: 50%;
            transform: translateY(-50%);
        }
        #annotate {
            position: absolute;
            top: 10px;
            right: 10px;
            color: #818181;
            font-size: 12px;
            padding: 15px;
            z-index: 51;
        }
        #save {
            cursor: pointer;
            position: absolute;
            top: 20px;
            left: 20px;
            color: #818181;
            font-size: 12px;
            padding: 10px 15px;
            z-index: 51;
            display: none;
            background-color: transparent;
        }
        `
    }
    constructor() {
        super()
        this.isOn = false
    }

    off() {
        this.isOn = false
        this.shadowRoot.querySelector('#container').style.display = 'none'
        this.$$save.style.display = 'none'
        this.$$selection.style.opacity = 0
    }

    on() {
        this.isOn = true
        this.shadowRoot.querySelector('#container').style.display = 'block'
    }

    toggle() {
        this.isOn = !this.isOn
        if (this.isOn) {
            this.on()
        } else {
            this.off()
        }
    }

    firstUpdated() {
        this.$$selection = this.shadowRoot.querySelector('#selection')
        this.$$save = this.shadowRoot.querySelector('#save')

        this.resize()
        window.addEventListener('resize', () => {
            this.resize()
        })
    }

    mouseDown(event) {
        this.startingPoint = event.clientX
        this.$$selection.style.left = `${event.clientX}px`
        this.mousedown = true
        this.$$save.style.display = 'none'
    }

    mouseUp(event) {
        this.endingPoint = event.clientX
        this.mousedown = false
        this.$$save.style.display = 'block'
    }

    mouseMove(event) {
        if (this.mousedown) {
            this.$$selection.style.opacity = 0.5
            if (event.clientX - this.startingPoint >= 0) {
                this.$$selection.style.width = `${event.clientX - this.startingPoint}px`
            } else {
                this.$$selection.style.left = `${event.clientX}px`
                this.$$selection.style.width = `${this.startingPoint - event.clientX}px`
            }
        }
    }

    save() {
        let points = {}
        if (this.startingPoint <= this.endingPoint) {
            points = {
                startX: this.startingPoint,
                endX: this.endingPoint,
            }
        } else {
            points = {
                startX: this.endingPoint,
                endX: this.startingPoint,
            }
        }
        const event = new CustomEvent('annotate', { detail: points })
        this.dispatchEvent(event)

        const btn = this.shadowRoot.querySelector('#save')
        const text = btn.innerHTML
        btn.innerHTML = 'Copied!'
        setTimeout(()=>{
            this.off()
            btn.innerHTML = text
        }, 1000)
    }

    resize() {
        this.annotateHeight = !Device.tabletLandscape ? (Config.tileHeight / 4) : window.innerHeight / 1.25
    }

    render() {
        return html`
        <a @click="${this.toggle}" href="javascript:void(0)" id="annotate">
         ${(!this.isOn) ? html`<span>Annotate</span>` : html`<span>Done</span>`}
        </a>
        <div id="container" @mousemove="${this.mouseMove}" @mousedown="${this.mouseDown}" @mouseup=${this.mouseUp}>
            <div id="selection" style="height: ${this.annotateHeight}px; margin-top: -100px"></div>
        </div>
        <button id="save" @click="${this.save}">Copy to clipboard</button>
        `
    }
}
customElements.define('annotate-el', Annotate)
