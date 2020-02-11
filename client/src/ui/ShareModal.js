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
import { dateToUTCDateTimeString, msToDate } from '../util/Date'

export class ShareModal extends LitElement {
    static get properties() {
        return {
            url: { type: String },
            timestamp: { type: String },
            linkWithTime: { type: Boolean },
            open: { type: Boolean },
        }
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
                    transform: translateY(0);
                }
            }

            #container {
                animation: appear 0.5s ease;
                color: #fff;
                background: #000;
                border: 1px solid #fff;
                position: absolute;
                bottom: 70px;
                left: 80px;
                padding: 33px;
                width: 470px;
                z-index: 10;
                opacity: 1;
            }

            #container.closing {
                opacity: 0;
                transition: opacity 0.15s ease-out;
            }

            .share-content {
                display: flex;
                flex-direction: column;
                margin-top: 24px;
            }

            .share-close {
                display: none;
            }

            .share-title {
                font-weight: 500;
                font-family: 'Roboto Mono', monospace;
                letter-spacing: 1px;
                font-size: 14px;
            }

            .link-wrap {
                position: relative;
            }

            .link-input {
                width: 78%;
                border: none;
                background: none;
                color: #fff;
                letter-spacing: 1.79px;
                font-size: 15px;
                font-family: 'Roboto';
                padding: 10px;
                border: 1px solid #fff;
            }

            #copy-button {
                position: absolute;
                top: 0;
                right: 0;
                color: #43c1f9;
                background: none;
                border: none;
                line-height: 1px;
                font-size: 14px;
                font-family: 'Roboto Mono', monospace;
                padding: 20px;
                right: -25px;
                min-width: 100px;
                text-align: center;
            }

            .timestamp-wrap {
                position: relative;
                margin-top: 20px;
                font-size: 14px;
                font-family: 'Roboto Mono', monospace;
                letter-spacing: 1px;
                font-weight: 400;
            }

            .timestamp-time {
                opacity: 0.7;
            }

            .social {
                display: flex;
            }

            .post-twitter,
            .post-facebook {
                border: none;
                background: none;
                height: 15px;
                padding-left: 144px;
                left: 0px;
                color: #43c1f9;
                position: relative;
                left: 0;
                margin-top: 15px;
                cursor: pointer;
            }

            .post-facebook {
                margin-left: 30px;
                width: 165px;
            }

            .post-twitter svg,
            .post-facebook svg {
                height: 15px;
                width: 15px;
                display: inline-block;
                fill: #43c1f9;
                position: absolute;
                left: 0;
                top: 0;
            }

            .post-twitter-text,
            .post-facebook-text {
                position: absolute;
                left: 20px;
                top: -3px;
                font-size: 15px;
                font-family: 'Roboto';
                line-height: 1.55;
                letter-spacing: 1.5px;
                width: 125px;
            }

            .post-facebook-text {
                width: 141px;
            }

            .container {
                display: inline-block;
                position: relative;
                padding-left: 30px;
                margin-bottom: 12px;
                cursor: pointer;
                -webkit-user-select: none;
                -moz-user-select: none;
                -ms-user-select: none;
                user-select: none;
            }

            /* Hide the browser's default radio button */
            .container input {
                position: absolute;
                opacity: 0;
                cursor: pointer;
            }

            .checkmark {
                position: absolute;
                top: 0;
                left: 0;
                height: 15px;
                width: 15px;
                border: 1px solid #fff;
            }

            .container:hover input ~ .checkmark {
                background-color: rgba(187, 255, 255, 0.4);
            }

            .container:hover input ~ .checkmark.off {
                background-color: rgba(151, 151, 151, 0.4);
            }

            .container input:checked ~ .checkmark {
                background: #bbffff;
                border: 1px solid #bbffff;
            }

            .container input:checked ~ .checkmark:before {
                content: ' ';
                position: absolute;
                z-index: 1;
                top: 7px;
                left: 0;
                width: 15px;
                height: 1px;
                background: #000;
                transform: rotate(45deg);
                transform-origin: center;
            }

            .container input:checked ~ .checkmark:after {
                content: ' ';
                position: absolute;
                z-index: 1;
                top: 7px;
                left: 0;
                width: 15px;
                height: 1px;
                background: #000;
                transform: rotate(-45deg);
                transform-origin: center;
            }

            .container input:checked ~ .checkmark:after {
                display: block;
            }

            @media only screen and (max-width: 1160px) {
                .social {
                    flex-direction: column;
                }

                .post-facebook {
                    margin-left: 0;
                    margin-top: 20px;
                }

                #copy-button {
                    padding: 20px 10px;
                }
            }

            @media only screen and (max-width: 768px) {
                #container {
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

                .share-close {
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

                .share-close-text {
                    font-size: 14px;
                    font-family: 'Roboto Mono', monospace;
                    letter-spacing: 1px;
                    font-weight: 700;
                }

                .share-close-text {
                    margin-right: 10px;
                    color: #fff;
                }

                .share-close-icon {
                    position: relative;
                    height: 11px;
                    width: 11px;
                    top: 2px;
                }

                .share-close-icon span {
                    width: 11px;
                    height: 1px;
                    position: absolute;
                    top: 5px;
                    right: 0;
                    background: #fff;
                }

                .share-close-icon span:first-of-type {
                    transform: rotate(45deg);
                }

                .share-close-icon span:last-of-type {
                    transform: rotate(-45deg);
                }

                .share-title {
                    margin: 0 18px;
                }

                .link-input {
                    width: 65%;
                }

                .share-content {
                    margin: 24px 18px 0;
                }

                .share-section {
                    padding: 20px;
                }
            }
        `
    }

    constructor() {
        super()
        this.linkWithTime = true
        this.extraParams
    }

    set open(open) {
        if (this.open && !open) {
            this.shadowRoot.querySelector('#container').classList.add('closing')
            setTimeout(() => {
                this._open = false
                this.requestUpdate()
            }, 150)
        } else {
            this._open = open
            this.requestUpdate()
            gtag('event', 'click_share')
        }
    }

    get open() {
        return this._open
    }

    handleTimestamp() {
        if (this.linkWithTime) {
            this.extraParams = '#' + this.url.split('#')[1]
            this.url = this.url.split('#')[0]
        } else {
            this.url = this.url + this.extraParams
        }
        this.linkWithTime = !this.linkWithTime
    }

    isOs() {
        return navigator.userAgent.match(/ipad|iphone/i)
    }

    copy() {
        this.$$urlField = this.shadowRoot.querySelector('#url')
        this.$$copyButton = this.shadowRoot.querySelector('#copy-button')
        this.$$urlField.select()
        if (this.isOs()) {
            this.$$urlField.contentEditable = true
            let range = document.createRange()
            range.selectNodeContents(this.$$urlField)
            let selection = window.getSelection()
            selection.removeAllRanges()
            selection.addRange(range)
            this.$$urlField.setSelectionRange(0, 999999)
            document.execCommand('copy')
        } else {
            document.execCommand('copy')
        }
        this.$$copyButton.innerHTML = 'Copied!'
        setTimeout(() => {
            this.$$copyButton.innerHTML = 'Copy'
        }, 700)
    }

    twitterShare() {
        this.share('twitter')
    }

    facebookShare() {
        this.share('facebook')
    }

    firstUpdated() {
        document.addEventListener('click', (event) => {
            this.bgClickHandler(event)
        })
        document.addEventListener('touchend', (event) => {
            this.bgClickHandler(event)
        })
    }

    bgClickHandler(event) {
        let isSettingsButton = false
        const path = event.path || (event.composedPath && event.composedPath())
        path.forEach((item) => {
            if (item && item.classList && item.classList.contains('share-wrap')) {
                isSettingsButton = true
            }
        })
        if (!isSettingsButton && this.open && path && path[0]) {
            if (!this.shadowRoot.contains(path[0])) {
                this.open = false
            }
        }
    }

    share(platform) {
        const text = this.linkWithTime
            ? encodeURIComponent(
                  `Listen to this underwater sound I found from ` +
                      msToDate(this.timestamp) +
                      ` ➝ ` +
                      this.url +
                      ` 🐳 ` +
                      `#patternradio #whalesongs #HumpbackWhales #ocean`
              )
            : `Explore thousands of hours of humpback whale songs and make your own discoveries ` +
              ` ➝ ` +
              this.url +
              ` #patternradio #whalesongs #HumpbackWhales #ocean`
        if (platform === 'twitter') {
            const twitURL = `https://twitter.com/intent/tweet?text=${text}`
            this.popup(twitURL, 253, 600)
        } else if (platform === 'facebook') {
            const fbURL = `https://www.facebook.com/sharer.php?u=${encodeURIComponent(this.url)}`
            this.popup(fbURL, 570, 520)
        }
    }

    popup(url, height, width) {
        const wLeft = window.screenLeft ? window.screenLeft : window.screenX
        const wTop = window.screenTop ? window.screenTop : window.screenY
        const left = wLeft + window.innerWidth / 2 - width / 2
        const top = wTop + window.innerHeight / 2 - height / 2
        window
            .open(
                url,
                '_blank',
                'location=yes,height=' +
                    height +
                    ',width=' +
                    width +
                    ',top=' +
                    top +
                    ',left=' +
                    left +
                    ',scrollbars=yes,status=no,toolbar=no,menubar=no,location=no'
            )
            .focus()
        return false
    }

    render() {
        return this.open
            ? html`
                  <div id="container" @click="${this.updateCopyText}">
                      <button
                          class="share-close"
                          @click="${() => {
                              this.open = false
                          }}"
                      >
                          <div class="share-close-text">
                              Close
                          </div>
                          <div class="share-close-icon">
                              <span></span>
                              <span></span>
                          </div>
                      </button>
                      <div class="share-title">Share</div>
                      <div class="share-content">
                          <div class="link-wrap">
                              <input
                                  contenteditable="true"
                                  readonly
                                  class="link-input"
                                  type="text"
                                  value=${this.url}
                                  id="url"
                              />
                              <button @click="${this.copy}" id="copy-button">Copy</button>
                          </div>
                          <div class="timestamp-wrap">
                              ${html`
                                  <label class="container"
                                      >Start at<span class="timestamp-time">
                                          ${dateToUTCDateTimeString(new Date(this.timestamp))}</span
                                      >
                                      <input type="checkbox" checked="checked" @click="${this.handleTimestamp}" />
                                      <span class="checkmark"></span>
                                  </label>
                              `}
                          </div>
                          <div class="social">
                              <a @click="${this.twitterShare}" id="twitter" class="post-twitter">
                                  <svg
                                      version="1.1"
                                      id="Layer_1"
                                      xmlns="http://www.w3.org/2000/svg"
                                      xmlns:xlink="http://www.w3.org/1999/xlink"
                                      x="0px"
                                      y="0px"
                                      viewBox="0 0 49.2 49.2"
                                      style="enable-background:new 0 0 49.2 49.2;"
                                      xml:space="preserve"
                                  >
                                      <path
                                          d="M24.6,0C11,0,0,11,0,24.6c0,13.6,11,24.6,24.6,24.6c13.6,0,24.6-11,24.6-24.6C49.2,11,38.2,0,24.6,0z M37,19.7
                      c0,0.3,0,0.5,0,0.8c0,8.2-6.2,17.7-17.7,17.7c-3.5,0-6.8-1-9.5-2.8c0.5,0.1,1,0.1,1.5,0.1c2.9,0,5.6-1,7.7-2.7
                      c-2.7-0.1-5-1.8-5.8-4.3c0.4,0.1,0.8,0.1,1.2,0.1c0.6,0,1.1-0.1,1.6-0.2c-2.8-0.6-5-3.1-5-6.1c0,0,0-0.1,0-0.1
                      c0.8,0.5,1.8,0.7,2.8,0.8c-1.7-1.1-2.8-3-2.8-5.2c0-1.1,0.3-2.2,0.8-3.1c3.1,3.8,7.6,6.2,12.8,6.5c-0.1-0.5-0.2-0.9-0.2-1.4
                      c0-3.4,2.8-6.2,6.2-6.2c1.8,0,3.4,0.8,4.5,2c1.4-0.3,2.7-0.8,3.9-1.5c-0.5,1.5-1.4,2.7-2.7,3.4c1.3-0.1,2.5-0.5,3.6-1
                      C39.3,17.7,38.2,18.8,37,19.7z"
                                      />
                                  </svg>
                                  <div class="post-twitter-text">Post to Twitter</div>
                              </a>
                              <button @click="${this.facebookShare}" id="facebook" class="post-facebook">
                                  <svg
                                      version="1.1"
                                      id="Layer_1"
                                      xmlns="http://www.w3.org/2000/svg"
                                      xmlns:xlink="http://www.w3.org/1999/xlink"
                                      x="0px"
                                      y="0px"
                                      viewBox="0 0 128 128"
                                      style="enable-background:new 0 0 128 128;"
                                      xml:space="preserve"
                                  >
                                      <g>
                                          <path
                                              d="M64,0C28.7,0,0,28.7,0,64c0,32.4,24.1,59.2,55.4,63.4c-0.5-0.1-1-0.1-1.5-0.2V81H37.2V64.3h16.8V48.8
                                      c0-15.6,9.2-24.8,23.1-24.8c6.7,0,13.8,1.6,13.8,1.6v16.9l-11.2,0c-7.6,0-9,3.8-9,9v12.8H90L87.3,81H70.7v46.6
                                      c-2.2,0.2-4.4,0.3-6.7,0.3c35.3,0,64-28.7,64-64C128,28.7,99.3,0,64,0z"
                                          />
                                      </g>
                                  </svg>
                                  <div class="post-facebook-text">Post to Facebook</div>
                              </button>
                          </div>
                      </div>
                  </div>
              `
            : html``
    }
}
customElements.define('share-modal', ShareModal)
