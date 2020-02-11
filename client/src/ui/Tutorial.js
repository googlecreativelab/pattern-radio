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

export class Tutorial extends LitElement {
    static get properties() {
        return {
            show: { type: Boolean },
            fadingOut: { type: Boolean },
        }
    }

    constructor() {
        super()
        this.hasShown = false
    }

    set show(show) {
        this.fadingOut = false
        clearTimeout(this.fadeTimeout)
        if (this._show && !show) {
            this.fadingOut = true
            this.fadeTimeout = setTimeout(() => {
                this._show = false
                this.fadingOut = false
                this.requestUpdate()
            }, 500)
            gtag('event', 'show_help')
        } else {
            this._show = show
            this.hasShown = true
            this.requestUpdate()
        }
    }

    get show() {
        return this._show
    }

    render() {
        return html`
            ${this.show
                ? html`
                      <div
                          @click=${() => {
                              this.show = false
                          }}
                          class="container ${this.fadingOut ? 'fadeout' : ''}"
                      >
                          <div class="tip spectrogram">
                              This <span class="highlight">spectrogram</span> visualizes the underwater recordings.
                              <div class="bar"></div>
                          </div>
                          <div class="tip heat">
                              This <span class="highlight">heat map</span> uses AI to help you navigate the data.
                              Brighter spots indicate where the algorithm is more confident there are whale songs.
                              <div class="bar"></div>
                          </div>
                          <div class="tip share">
                              <span class="highlight">Share a link</span> directly to moments you find interesting.
                              <div class="bar"></div>
                          </div>
                          <div class="tip scroll">
                              If you have a trackpad, scroll vertically to zoom in and out, and horizontally to move
                              left/right. Or, use the <span class="highlight">scroll bar</span> and
                              <span class="highlight">+/-</span> buttons.
                              <div class="bar"></div>
                          </div>
                          <div class="tip tour">
                              Take a <span class="highlight">tour</span> of moments whale researchers find interesting.
                              <div class="bar"></div>
                          </div>
                      </div>
                  `
                : ''}
        `
    }

    static get styles() {
        return css`
            @keyframes appear {
                from {
                    opacity: 0;
                }
                to {
                    opacity: 1;
                }
            }

            .tip {
                animation-name: appear;
                animation-duration: 0.5s;
                animation-timing-function: ease;
                animation-fill-mode: forwards;
            }

            .tip.tour {
                animation-delay: 0.2s;
            }

            .tip.spectrogram {
                animation-delay: 0.4s;
            }

            .tip.heat {
                animation-delay: 0.6s;
            }

            .tip.share {
                animation-delay: 0.8s;
            }

            .tip.scroll {
                animation-delay: 1s;
            }

            .tip:nth-child(6) {
                animation-delay: 0s;
            }

            .container.fadeout {
                pointer-events: none;
                opacity: 0;
            }

            .container {
                position: fixed;
                top: 0;
                left: 0;
                opacity: 1;
                transition: opacity 0.25s ease-out;
                height: 100%;
                width: 100%;
                color: #fff;
                cursor: pointer;
                box-sizing: border-box;
            }

            .tip {
                padding: 12px 16px;
                color: #000;
                font-size: 14px;
                font-family: 'Roboto';
                letter-spacing: 1.55px;
                line-height: 1.714;
                position: absolute;
                width: 100%;
                opacity: 0;
                background: #bbffff;
                text-align: center;
                border-radius: 4px;
            }

            .highlight {
                font-weight: 700;
            }

            .bar {
                position: absolute;
                background: #bbffff;
                height: 1px;
                width: 70px;
                z-index: -1;
            }

            .spectrogram {
                left: 50vw;
                top: 35vh;
                transform: translate(-50%, -50%);
                max-width: 277px;
            }

            .spectrogram .bar {
                position: absolute;
                left: -60px;
                display: block;
                top: 50%;
            }

            .heat {
                max-width: 427px;
                top: 50%;
                transform: translateY(-50%);
                right: 20vw;
                margin-top: 290px;
            }

            .heat .bar {
                position: absolute;
                display: block;
                width: 1px;
                height: 70px;
                top: -50px;
                right: 50%;
            }

            .share {
                left: 30px;
                bottom: 170px;
                max-width: 282px;
            }

            .share .bar {
                position: absolute;
                bottom: -72px;
                display: block;
                height: 70px;
                width: 1px;
                left: 120px;
            }

            .scroll {
                transform: translate(-50%, -50%);
                bottom: 40px;
                max-width: 351px;
                right: -140px;
            }

            .scroll .bar {
                display: none;
            }

            .tour {
                right: unset;
                left: 50vw;
                transform: translateX(65%);
                top: 24px;
                max-width: 309px;
            }

            .tour .bar {
                position: absolute;
                left: -53px;
                top: 50%;
                display: block;
            }

            .guide {
                box-shadow: none;
                background: black;
                bottom: 0;
                left: 50%;
                transform: translateX(-50%);
                height: 99px;
                width: 30%;
                display: flex;
                flex-direction: column;
                justify-content: center;
                color: #fff;
                z-index: -1;
            }

            .title {
                font-size: 21px;
                font-family: 'Roboto';
                font-weight: 500;
                line-height: 1.1;
                margin-bottom: 7px;
            }

            .desc {
                font-size: 14px;
                font-family: 'Roboto';
                letter-spacing: 1.55px;
                line-height: 1.714;
            }

            @media only screen and (max-height: 1070px) {
                .heat {
                    margin-top: 90px;
                }

                .heat .bar {
                    top: unset;
                    bottom: -50px;
                    right: 50%;
                }
            }

            @media only screen and (max-height: 949px) {
                .heat {
                    margin-top: 90px;
                }
            }

            @media only screen and (max-height: 800px) {
                .heat {
                    right: 24vw;
                    margin-top: -2px;
                }

                .spectrogram {
                    left: 35vw;
                    top: 36vh;
                }
            }

            @media only screen and (max-height: 768px) {
                .heat {
                    top: 56%;
                }
            }

            @media only screen and (max-height: 667px) {
                .heat {
                    top: 50vh;
                    right: 10vw;
                }

                .heat .bar {
                    bottom: -25px;
                }
            }

            @media only screen and (max-height: 618px) {
                .guide {
                    display: none;
                }
            }

            @media only screen and (max-width: 1165px) {
                .tour {
                    max-width: 250px;
                }

                .tour .bar {
                    left: -33px;
                }
            }

            @media only screen and (max-width: 958px) {
                .tour {
                    max-width: 200px;
                    left: 48vw;
                    top: 38px;
                }
            }

            @media only screen and (max-width: 768px) {
                .tour,
                .scroll,
                .share,
                .guide {
                    display: none;
                }

                .spectrogram {
                    max-width: unset;
                    box-sizing: border-box;
                    left: 20%;
                    width: 60%;
                    top: 38%;
                    transform: translateY(-100%);
                    margin-top: -90px;
                }

                .spectrogram .bar {
                    top: unset;
                    left: 50%;
                    width: 1px;
                    bottom: -10vh;
                    height: 10vh;
                }

                .heat {
                    max-width: unset;
                    box-sizing: border-box;
                    width: 80%;
                    left: 10%;
                    bottom: 37%;
                    transform: translateY(100%);
                    margin-bottom: -90px;
                    top: unset;
                }

                .heat .bar {
                    transform: scale(-1, 1);
                    top: -10vh;
                    height: 10vh;
                }

                .heat .bar,
                .spectrogram .bar {
                    left: 20%;
                }

                .title {
                    display: none;
                }
            }

            @media only screen and (max-width: 374px) {
                .spectrogram {
                    margin-top: 0;
                }

                .heat {
                    margin-bottom: 0;
                }

                .heat .bar,
                .spectrogram .bar {
                    display: none;
                }
            }
        `
    }
}
customElements.define('tutorial-element', Tutorial)
