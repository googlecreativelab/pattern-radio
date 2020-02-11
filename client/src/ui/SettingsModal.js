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
import { SimilarityLayerConfig } from '../components/SimilarityLayer'
import { SpectrogramTileDefitionsConfig } from '../models/SpectrogramTileDefinitions'
import { setNoiseCancelling } from '../components/AudioNoiseCancelling'
import { FrequenciesConfig } from '../components/Frequencies'
import { setGain } from '../components/AudioNoiseCancelling'
export class SettingsModal extends LitElement {
    static get properties() {
        return {
            open: { type: Boolean, reflect: true, attribute: true },
        }
    }

    constructor() {
        super()
        this.open = false
        this._open = false
        this._volume = 0.3
        this._useSimilarityHighlighting = true
        this._useVisualNoiseReduction = true
        this._showFrequencies = false
    }

    set open(open) {
        if (this.open && !open) {
            this.shadowRoot.querySelector('.settings-section-container').classList.add('closing')
            setTimeout(() => {
                this._open = false
                this.requestUpdate()
            }, 150)
        } else {
            this._open = open
            this.requestUpdate()
            gtag('event', 'click_settings')
        }
    }

    get open() {
        return this._open
    }

    firstUpdated() {
        document.addEventListener('click', (event) => {
            this.bgClickhanlder(event)
        })
        document.addEventListener('touchend', (event) => {
            this.bgClickhanlder(event)
        })
    }

    bgClickhanlder(event) {
        let isSettingsButton = false
        const path = event.path || (event.composedPath && event.composedPath())
        if (path) {
            path.forEach((item) => {
                if (item && item.classList && item.classList.contains('settings-wrap')) {
                    isSettingsButton = true
                }
            })
        }
        if (!isSettingsButton && this.open && path && path[0]) {
            if (!this.shadowRoot.contains(path[0])) {
                this.open = false
            }
        }
    }

    useSimilarityHighlighting(event) {
        SimilarityLayerConfig.alpha = event.currentTarget.checked ? 0.5 : 0
        this._useSimilarityHighlighting = event.currentTarget.checked
    }

    showFrequency(event) {
        FrequenciesConfig.showFrequencies = event.currentTarget.checked
        this._showFrequencies = event.currentTarget.checked
    }

    useAudioNoiseReduction(event) {
        setNoiseCancelling(!event.currentTarget.checked)
    }

    useVisualNoiseReduction(event) {
        SpectrogramTileDefitionsConfig.denoise = event.currentTarget.checked
        this._useVisualNoiseReduction = event.currentTarget.checked
    }

    setVolume(event) {
        const value = event.currentTarget.value
        this._volume = value
        setGain(value)
    }

    render() {
        return this.open
            ? html`
                  <div class="settings-section-container">
                      <button
                          class="settings-close"
                          @click="${() => {
                              this.open = false
                          }}"
                      >
                          <div class="settings-close-text">
                              Close
                          </div>
                          <div class="settings-close-icon">
                              <span></span>
                              <span></span>
                          </div>
                      </button>
                      <div class="settings-title">Settings</div>
                      <div class="settings-section range-ui-container settings-section--spectrogram">
                          <label for="volume" class="range-label container">Volume</label>
                          <input
                              id="volume"
                              @input=${this.setVolume}
                              @change=${this.setVolume}
                              type="range"
                              min="0"
                              max="1"
                              step="0.01"
                              value="${this._volume}"
                          />
                      </div>
                      <div class="settings-section settings-section--spectrogram">
                          <label class="container">
                              <div class="settings-section-radio-title">
                                  Highlight similar sounds
                              </div>
                              <div class="switch">
                                  <input
                                      @input=${this.useSimilarityHighlighting}
                                      @change=${this.useSimilarityHighlighting}
                                      type="checkbox"
                                      id="slider"
                                      ?checked=${this._useSimilarityHighlighting}
                                  />
                                  <span class="slider round"></span>
                              </div>
                          </label>
                      </div>
                      <div class="settings-section">
                          <label class="container">
                              <div class="settings-section-radio-title">
                                  Reduce visual noise
                              </div>
                              <div class="switch">
                                  <input
                                      @input=${this.useVisualNoiseReduction}
                                      @change=${this.useVisualNoiseReduction}
                                      type="checkbox"
                                      id="slider"
                                      ?checked=${this._useVisualNoiseReduction}
                                  />
                                  <span class="slider round"></span>
                              </div>
                          </label>
                      </div>
                      <div class="settings-section">
                          <label class="container">
                              <div class="settings-section-radio-title">
                                  Show frequency values
                              </div>
                              <div class="switch">
                                  <input
                                      @input=${this.showFrequency}
                                      @change=${this.showFrequency}
                                      ?checked=${this._showFrequencies}
                                      type="checkbox"
                                      id="slider"
                                  />
                                  <span class="slider round"></span>
                              </div>
                          </label>
                      </div>
                  </div>
              `
            : html``
    }

    static get styles() {
        return css`
            :host {
                position: relative;
            }

            @keyframes appear {
                from {
                    opacity: 0;
                    transform: translateY(10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0px);
                }
            }

            .settings-section-container {
                box-sizing: border-box;
                animation: appear 0.5s ease;
                color: #fff;
                background: #000;
                border: 1px solid #fff;
                position: absolute;
                bottom: 70px;
                left: 0;
                padding: 30px;
                width: 33vw;
                max-width: 400px;
                z-index: 10;
                opacity: 1;
            }

            .settings-section-container.closing {
                opacity: 0;
                transition: opacity 0.15s ease-out;
            }

            .settings-close {
                display: none;
            }

            .settings-title {
                font-weight: 500;
                font-family: 'Roboto Mono', monospace;
                letter-spacing: 1px;
                font-size: 14px;
                margin-bottom: 20px;
            }

            .settings-section-title,
            .settings-close-text {
                font-family: 'Roboto Mono', monospace;
                letter-spacing: 1px;
                font-size: 14px;
            }

            .settings-section-title {
                margin-bottom: 20px;
            }

            .settings-section {
                border-top: 1px solid #4c4c4c;
            }

            .settings-section:last-of-type {
                border-bottom: 1px solid #4c4c4c;
            }

            .settings-section .container:not(:first-of-type) {
                margin-left: 20px;
            }

            .settings-section .radio-wrap .container:not(:first-of-type) {
                margin-left: 0;
            }

            .settings-section-radio-title {
                font-family: 'Roboto Mono', monospace;
                letter-spacing: 1px;
                font-size: 14px;
                position: relative;
                top: 2px;
            }

            .settings-section--radio {
                display: flex;
                border-top: none;
                flex-direction: row;
                align-items: center;
                padding: 24px 0;
                justify-content: space-between;
            }

            .settings-section-input {
                margin-right: 10px;
            }

            /* styled fields */
            .container {
                display: inline-block;
                position: relative;
                cursor: pointer;
                -webkit-user-select: none;
                -moz-user-select: none;
                -ms-user-select: none;
                user-select: none;
                width: 100%;
                display: flex;
                justify-content: space-between;
                padding: 20px 0;
            }

            /* Hide the browser's default radio button */
            .container input {
                position: absolute;
                opacity: 0;
                cursor: pointer;
            }

            /* Create a custom radio button */
            .checkmark {
                position: absolute;
                top: 0;
                left: 0;
                height: 21px;
                width: 21px;
                background-color: #000;
                border-radius: 50%;
                border: 1px solid #fff;
            }

            .container:hover input ~ .checkmark {
                background-color: rgba(187, 255, 255, 0.4);
            }

            .container:hover input ~ .checkmark.off {
                background-color: rgba(151, 151, 151, 0.4);
            }

            .container input:checked ~ .checkmark:before {
                content: ' ';
                position: absolute;
                z-index: 1;
                top: 5px;
                left: 5px;
                right: 5px;
                bottom: 5px;
                background: #bbffff;
                border-radius: 50%;
            }

            .checkmark:after {
                content: '';
                position: absolute;
                display: none;
            }

            .container input:checked ~ .checkmark:after {
                display: block;
            }

            .switch {
                position: relative;
                display: inline-block;
                width: 46px;
                height: 24px;
                margin-left: 20px;
            }

            .switch input {
                opacity: 0;
                width: 0;
                height: 0;
            }

            .slider {
                position: absolute;
                cursor: pointer;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                border: 1px solid #fff;
                background-color: #000;
                -webkit-transition: 0.2s;
                transition: 0.2s;
            }

            .slider:before {
                position: absolute;
                content: '';
                height: 18px;
                width: 18px;
                left: 3px;
                bottom: 2px;
                background-color: #333333;
                -webkit-transition: 0.2s;
                transition: 0.2s;
            }

            input:checked + .slider {
                background-color: #000;
            }

            input:focus + .slider {
                box-shadow: 0 0 1px #2196f3;
            }

            input:checked + .slider:before {
                -webkit-transform: translateX(20px);
                -ms-transform: translateX(20px);
                transform: translateX(20px);
                background-color: #bbffff;
            }

            /* Rounded sliders */
            .slider.round {
                border-radius: 34px;
            }

            .slider.round:before {
                border-radius: 50%;
            }

            @media only screen and (max-width: 1100px) {
                .settings-section-container {
                    width: 60vw;
                }
            }

            @media only screen and (max-width: 768px) {
                .settings-section-container {
                    position: fixed;
                    top: 0;
                    left: 0;
                    height: 100%;
                    width: 100vw;
                    z-index: 54;
                    max-width: initial;
                    padding: 15% 0;
                    border: none;
                }

                .settings-title {
                    margin-left: 20px;
                    font-size: 14px;
                }

                .settings-close-text {
                    font-size: 14px;
                    font-family: 'Roboto Mono', monospace;
                    letter-spacing: 1px;
                    font-weight: 700;
                }

                .settings-close {
                    position: absolute;
                    padding: 20px;
                    top: 0;
                    right: 0;
                    display: flex;
                    align-items: center;
                    background: none;
                    border: none;
                    cursor: pointer;
                }

                .settings-close-text {
                    margin-right: 10px;
                    color: #fff;
                }

                .settings-close-icon {
                    position: relative;
                    height: 11px;
                    width: 11px;
                    top: 2px;
                }

                .settings-close-icon span {
                    width: 11px;
                    height: 1px;
                    position: absolute;
                    top: 5px;
                    right: 0;
                    background: #fff;
                }

                .settings-close-icon span:first-of-type {
                    transform: rotate(45deg);
                }

                .settings-close-icon span:last-of-type {
                    transform: rotate(-45deg);
                }

                .settings-section {
                    padding: 0 20px;
                }

                input:checked + .slider:before {
                    -webkit-transform: translateX(17px);
                    -ms-transform: translateX(17px);
                    transform: translateX(17px);
                }

                .settings-section-radio-title {
                    top: 3px;
                }
            }

            .switch {
                max-width: 46px;
            }

            .range-ui-container {
                display: flex;
            }

            .range-label {
                font-family: 'Roboto Mono', monospace;
                letter-spacing: 1px;
                font-size: 14px;
                width: 30%;
                padding-right: 20px;
            }

            #volume {
                width: 70%;
            }

            input[type='range'] {
                -webkit-appearance: none;
                height: 1px;
                margin-top: 31px;
                background: rgba(255, 255, 255, 0.6);
                outline: none;
                -webkit-transition: 0.2s;
                transition: opacity 0.2s;
            }

            input[type='range']::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 19px;
                height: 19px;
                cursor: pointer;
                background: #bbffff;
                border-radius: 12.5px;
            }

            input[type='range']::-moz-range-thumb {
                width: 19px;
                height: 19px;
                cursor: pointer;
                background: #bbffff;
                border-radius: 12.5px;
            }

            @media only screen and (max-width: 340px) {
                input:checked + .slider:before {
                    -webkit-transform: translateX(10px);
                    -ms-transform: translateX(10px);
                    transform: translateX(10px);
                }
            }
        `
    }
}
customElements.define('settings-modal', SettingsModal)
