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

export class CommentsModal extends LitElement {
    static get properties() {
        return {
            author: { type: Object },
            show: { type: Boolean },
        }
    }

    static get styles() {
        return css`
            @keyframes appear {
                from {
                    opacity: 0;
                    transform: scale(1.1, 1.1);
                }
                to {
                    opacity: 1;
                    transform: scale(1, 1);
                }
            }

            .author-overlay {
                position: fixed;
                top: 0;
                left: 0;
                height: 100%;
                width: 100vw;
                z-index: 55;
                max-width: initial;
                background: rgba(0, 0, 0, 0.7);
                display: fixed;
                align-items: center;
                justify-content: center;
                display: flex;
                color: #fff;
                animation: appear 0.5s ease;
            }

            .author-overlay.closing {
                opacity: 0;
                transition: opacity 0.25s ease-out;
            }

            .author-box {
                border: 1px solid #fff;
                padding: 24px;
                width: 50%;
                background: #000;
                position: relative;
                text-align: center;
                max-width: 600px;
                box-sizing: border-box;
            }

            .author-box-content {
                margin-top: 26px;
                text-align: center;
            }

            .author-close-container {
                position: absolute;
                top: 0;
                right: 0;
            }

            .author-close-wrap {
                background: none;
                border: none;
                color: #fff;
                display: flex;
                padding: 24px;
                align-items: center;
                cursor: pointer;
                width: 100%;
            }

            .author-close {
                height: 34px;
                width: 34px;
                border: 1px solid #fff;
                border-radius: 50%;
                position: relative;
                transform: rotate(45deg);
            }

            .author-close span {
                background: #fff;
            }

            .author-close span:first-of-type {
                position: absolute;
                width: 1px;
                top: 8px;
                height: 17px;
                left: 16px;
            }

            .author-close span:last-of-type {
                position: absolute;
                height: 1px;
                width: 17px;
                top: 16px;
                left: 8px;
            }

            #beginCommentTour {
                background: none;
                border: 1px solid #fff;
                color: #fff;
                padding: 12px 14px;
                font-family: 'Roboto Mono', monospace;
                letter-spacing: 1.41px;
                font-size: 15px;
                text-transform: uppercase;
                margin-top: 60px;
                cursor: pointer;
                font-weight: 500;
                transition: 0.2s ease-in;
            }

            #beginCommentTour:hover {
                background: #212121;
            }

            .-small {
                height: 115px;
                width: 115px;
                object-fit: cover;
                border-radius: 50%;
                overflow: hidden;
            }

            .text {
                display: flex;
                flex-direction: column;
                text-align: left;
                margin-left: 15px;
                align-items: center;
            }

            .name {
                font-weight: 500;
                font-family: 'Roboto Mono', monospace;
                letter-spacing: 1px;
                font-size: 18px;
                margin-bottom: 3px;
            }

            .title {
                font-family: 'Roboto Mono', monospace;
                text-align: center;
                margin-top: 2px;
                font-size: 12px;
                letter-spacing: 1px;
            }

            .author-tutorial-text {
                font-family: 'Roboto';
                letter-spacing: 1.4px;
                font-size: 16px;
                margin: 22px auto 0;
                max-width: 480px;
                line-height: 1.625;
            }

            @media only screen and (max-width: 768px) {
                .author-box {
                    width: 80%;
                }

                .author-close {
                    height: 25px;
                    width: 25px;
                }

                .author-close span:first-of-type {
                    height: 14px;
                    top: 5px;
                    left: 12px;
                }

                .author-close span:last-of-type {
                    width: 14px;
                    top: 11px;
                    left: 5px;
                }

                #beginCommentTour {
                    margin-top: 20px;
                }

                .-small {
                    height: 65px;
                    width: 65px;
                }

                .author-tutorial-text {
                    font-size: 14px;
                }
            }
        `
    }

    constructor() {
        super()
    }

    set show(show) {
        if (this.show && !show) {
            this.shadowRoot.querySelector('.author-overlay').classList.add('closing')
            setTimeout(() => {
                this._show = false
                this.requestUpdate()
            }, 150)
        } else {
            this._show = show
            this.requestUpdate()
        }
    }

    get show() {
        return this._show
    }

    begin() {
        this.show = false
        const event = new CustomEvent('begin', { detail: { author: this.author } })
        this.dispatchEvent(event)
        gtag('event', 'begin_tour', { event_label: this.author.name })
    }

    close() {
        this.show = false
    }

    render() {
        return this.show && this.author && this.author.name
            ? html`
                  <div class="author-overlay">
                      <div class="author-box">
                          <div class="author-close-container">
                              <button class="author-close-wrap" @click=${this.close}>
                                  <div class="author-close">
                                      <span></span>
                                      <span></span>
                                  </div>
                              </button>
                          </div>
                          <div class="author-box-content">
                              <img class="-small" src=${this.author.image} alt=${this.author.alt} />
                              <div class="text">
                                  <p class="name">${this.author.name}</p>
                                  <p class="title">${this.author.title}</p>
                              </div>
                              <div class="author-tutorial-text">
                                  ${this.author.blurb}
                              </div>
                              <button id="beginCommentTour" @click="${this.begin}">Begin Tour</button>
                          </div>
                      </div>
                  </div>
              `
            : html``
    }
}
customElements.define('comments-modal', CommentsModal)
