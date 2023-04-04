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

export class Intro extends LitElement {
    static get properties() {
        return {
            tutorial: { type: Number },
        }
    }

    static get styles() {
        return css`
            :host {
                display: flex;
                width: 100%;
                background: rgba(0, 0, 0, 0.5);
                position: fixed;
                z-index: 4;
                height: 100%;
                top: 0;
                left: 0;
                align-items: center;
                justify-content: center;
                text-align: center;
                color: #fff;
                filter: blur(0);
                transition: visibility 1s, opacity 1s linear, filter 1s linear;
            }
            .hidden {
                filter: blur(10px);
            }

            .intro {
                text-align: center;
                display: flex;
                flex-direction: column;
                align-items: center;
            }

            .intro-content {
                text-align: center;
                display: flex;
                flex-direction: column;
                align-items: center;
            }

            .logo {
                font-family: 'Roboto Mono', 'monospace';
                letter-spacing: 0.2em;
                font-size: 60px;
                text-transform: uppercase;
                padding: 0 20px;
                font-weight: 100;
            }

            .logo span {
                font-family: 'Roboto Mono';
                font-weight: 500;
            }

            .excerpt {
                margin-top: 1em;
                font-weight: 400;
                font-family: 'Roboto Mono', monospace;
                max-width: 800px;
                line-height: 1.81;
                letter-spacing: 0.12em;
                font-size: 18px;
                max-width: 900px;
                width: 80%;
                font-style: inherit;
            }

            .buttons {
                display: flex;
                flex-direction: column;
                margin-top: 50px;
            }

            .cursor,
            .play {
                display: inline-block;
                position: relative;
                margin-right: 12px;
                top: 4px;
            }

            .cursor {
                width: 16px;
            }

            .play {
                width: 20px;
            }

            .cursor svg,
            .play svg {
                height: 100%;
                width: 100%;
            }

            .intro-button {
                border: 1px solid #fff;
                padding: 0 16px;
                color: #fff;
                text-decoration: none;
                font-family: 'Roboto Mono', monospace;
                font-size: 16px;
                text-transform: uppercase;
                letter-spacing: 0.12em;
                font-weight: 500;
                transition: 0.2s ease-in all;
                width: 220px;
                height: 70px;
                box-sizing: border-box;
                display: flex;
                align-items: center;
                justify-content: center;
                text-align: center;
            }

            .intro-button--about {
                margin-top: 47px;
                border: none;
                font-family: 'Roboto';
                font-weight: 500;
                font-size: 12px;
                text-transform: initial;
                display: flex;
                align-items: center;
            }

            .intro-button--about svg {
                height: 30px;
                width: 30px;
                fill: #fff;
                margin-left: 10px;
            }

            .intro-button:hover {
                background: rgba(255, 255, 255, 0.13);
            }

            .intro-button--about:hover {
                opacity: 0.6;
                background: none;
            }

            .footer {
                position: absolute;
                bottom: 20px;
                left: 20px;
                display: flex;
                align-items: center;
            }

            .intro-credit {
                display: flex;
                align-items: center;
            }

            #tands {
                color: white;
                position: absolute;
                bottom: 20px;
                right: 20px;
                font-size: 14px;
            }

            #tands a,
            #tands a:link {
                color: white;
            }

            .noaa {
                height: 50px;
                width: 50px;
                margin-right: 18px;
            }

            .google {
                width: 68px;
                height: 44px;
                margin-left: 18px;
            }

            .divider {
                background: #fff;
                height: 48px;
                width: 1px;
            }

            .experiment {
                width: 82px;
                height: 56px;
                margin: 0 18px;
            }

            .experiment svg,
            .google svg,
            .noaa svg {
                fill: #fff;
                height: 100%;
                width: 100%;
            }

            @media only screen and (max-width: 768px) {
                .logo {
                    font-size: 28px;
                }

                .intro {
                    margin: -19% 18px 0;
                }

                .noaa {
                    height: 42px;
                    width: 42px;
                    margin-right: 10px;
                }

                .experiment {
                    width: 74px;
                    height: 42px;
                    margin: 0 10px;
                }

                .divider {
                    height: 42px;
                }

                .google {
                    width: 62px;
                    height: 42px;
                    margin-left: 10px;
                }

                .excerpt {
                    width: 90%;
                }

                .intro-button {
                    padding: 20px 22px 18px;
                }

                .intro-button--about {
                    margin-top: 24px;
                }

                .footer {
                    width: 100%;
                    left: 0;
                    justify-content: center;
                }

                #tands {
                    top: 20px;
                }
            }

            @media only screen and (max-width: 400px) {
                .buttons {
                    margin-top: 40px;
                }

                .intro-button {
                    padding: 7% 10% 8%;
                }

                .logo {
                    font-size: 23px;
                }
            }
            /* Landscape */
            @media only screen and (max-height: 499px) and (orientation: landscape) {
                .intro {
                    margin-top: -40px;
                }
                .logo {
                    font-size: 24px;
                }
                .excerpt {
                    font-size: 14px;
                }
                .intro-button {
                    font-size: 14px;
                    padding: 2px;
                    height: 60px;
                }
                .buttons {
                    height: 50px;
                    margin-top: 10px;
                }
            }
        `
    }

    constructor() {
        super()
        this.showing = !Config.skipIntro
        this.hasShown = Config.skipIntro

        if (this.showing) {
            gtag('event', 'screen_view', { screen_name: 'Splashscreen' })
        }
    }

    hide() {
        this.classList.add('hidden')
        this.showing = false
        const event = new CustomEvent('close')
        this.dispatchEvent(event)
        this.hasShown = true

        gtag('event', 'screen_view', { screen_name: 'Main' })
    }

    show() {
        this.classList.remove('hidden')
        this.showing = true

        gtag('event', 'screen_view', { screen_name: 'Splashscreen' })
    }

    tutorial() {
        this.hide()
        const event = new CustomEvent('tutorial')
        this.dispatchEvent(event)
    }

    explore() {
        this.hide()
    }

    render() {
        return html`
            <div class="intro">
                <div class="logo"><span>Pattern Radio:</span> Whale&nbsp;Songs</div>

                <h3 class="excerpt">
                    Use AI to explore thousands of hours of humpback whale songs and make your own discoveries.
                </h3>
                <div class="buttons">
                    <a
                        class="intro-button intro-button--explore"
                        @click="${this.explore}"
                        href="javascript:void(0)"
                        id="start"
                        >Start Exploring</a
                    >
                    <!-- <a class="intro-button intro-button--about" target="_blank" href="https://medium.com/" id="about"><span>About the project</span>
                  <svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
                      viewBox="0 0 26 26" style="enable-background:new 0 0 26 26;" xml:space="preserve">
                  <path d="M9.9,10.6h3.8v6.3h2.4V18H9.9v-1.1h2.5v-5.2H9.9V10.6z M12.3,8.7c0-0.2,0.1-0.4,0.2-0.5C12.6,8,12.8,8,13,8
                    c0.3,0,0.4,0.1,0.6,0.2c0.1,0.1,0.2,0.3,0.2,0.5c0,0.2-0.1,0.4-0.2,0.5c-0.1,0.1-0.3,0.2-0.6,0.2c-0.3,0-0.4-0.1-0.6-0.2
                    S12.3,8.9,12.3,8.7z"/>
                  <path d="M13,26C5.8,26,0,20.2,0,13C0,5.8,5.8,0,13,0c7.2,0,13,5.8,13,13C26,20.2,20.2,26,13,26z M13,1C6.4,1,1,6.4,1,13
                    c0,6.6,5.4,12,12,12c6.6,0,12-5.4,12-12C25,6.4,19.6,1,13,1z"/>
                  </svg>             
                </a> -->
                </div>
                <div class="footer">
                    <a target="_blank" class="noaa" aria-label="Go to NOAA website" href="https://www.noaa.gov/">
                        <svg
                            version="1.1"
                            id="Layer_1"
                            xmlns="http://www.w3.org/2000/svg"
                            xmlns:xlink="http://www.w3.org/1999/xlink"
                            x="0px"
                            y="0px"
                            viewBox="0 0 50.1 50"
                            style="enable-background:new 0 0 50.1 50;"
                            xml:space="preserve"
                        >
                            <path
                                id="Fill-70"
                                d="M48,14.9c1.3,3.1,2.1,6.5,2.1,10c0,13.8-11.2,25-25,25C11.2,50,0,38.8,0,25c0-2.4,0.3-4.8,1-7
                    c0,0,1.9,0.4,4,2.4c0,0,9,12.1,19.9,11.3c0,0-4,2.9-7.7,3.1c0,0,2.1,3.2,12.1-1.9c3.3-1.7,7.8-2.1,7.7-2.2c-2.1-1.3-5.9-1-5.9-1
                    C38.6,27.7,48,14.9,48,14.9"
                            />
                            <path
                                id="Combined-Shape"
                                d="M4.2,11C8.7,4.4,16.4,0,25,0c8.2,0,15.6,4,20.1,10.1c0,0-5.6,1.9-7.3,8.1c0,0-2.6,10.5-11,11.4
                    c0,0-5.3,1.4-13.4-10.8C8.4,11.6,4.2,11,4.2,11z M17.7,11.4v5h1.5v-5.1c0,0-0.2-1.2-1.1-1.2h-3.2v6.3h1.3v-5c0-0.2,0.3-0.2,0.3-0.2
                    h1C17.6,11.1,17.7,11.4,17.7,11.4z M23.4,16.4c0.6,0,1.1-0.5,1.1-1V11c0-0.6-0.5-1-1.1-1h-2.1c-0.5,0-1,0.5-1,1v4.3c0,0.6,0.5,1,1,1
                    H23.4z M23,15.5h-1.3c-0.1,0-0.2-0.1-0.2-0.2v-4c0-0.1,0.1-0.2,0.2-0.2H23c0.1,0,0.3,0.1,0.3,0.2v4C23.3,15.3,23.1,15.5,23,15.5z
                      M29.8,16.4v-5.3c0-0.6-0.5-1-1.1-1h-2.1c-0.6,0-1,0.5-1,1v5.3h1.2v-2.6h1.7v2.6H29.8z M28.5,12.7h-1.8v-1.4c0-0.1,0.1-0.2,0.3-0.2
                    h1.3c0.1,0,0.3,0.1,0.3,0.2V12.7z M35.2,16.5v-5.3c0-0.5-0.5-1-1-1h-2.1c-0.6,0-1,0.5-1,1v5.3h1.2v-2.7H34v2.7H35.2z M34,12.8h-1.8
                    v-1.4c0-0.1,0.1-0.2,0.3-0.2h1.3c0.1,0,0.2,0.1,0.2,0.2V12.8z"
                            />
                        </svg>
                    </a>
                    <div class="divider"></div>
                    <a
                        target="_blank"
                        class="intro-credit"
                        aria-label="Go to AI for Social Good website"
                        href="https://ai.google/social-good/"
                    >
                        <div class="experiment">
                            <svg
                                version="1.1"
                                id="Layer_1"
                                xmlns="http://www.w3.org/2000/svg"
                                xmlns:xlink="http://www.w3.org/1999/xlink"
                                x="0px"
                                y="0px"
                                viewBox="0 0 118 42.5"
                                style="enable-background:new 0 0 118 42.5;"
                                xml:space="preserve"
                            >
                                <path
                                    d="M5.9,0.2h2.4L14.1,16h-2.3l-1.6-4.7H3.9L2.2,16H0L5.9,0.2z M9.5,9.5l-2.4-7l-2.5,7H9.5z"
                                />
                                <path d="M16.5,0.2h2.2V16h-2.2V0.2z" />
                                <path
                                    d="M28.9,1c0.5-0.7,1.3-1,2.6-1c0.1,0,0.2,0,0.4,0s0.3,0,0.4,0v1.8c-0.2,0-0.3,0-0.4,0c-0.1,0-0.2,0-0.3,0
                      c-0.6,0-0.9,0.2-1.1,0.5c-0.1,0.3-0.2,1.1-0.2,2.3h1.9v1.5h-1.9V16h-1.9V6.1h-1.6V4.6h1.6V2.8C28.5,1.9,28.6,1.4,28.9,1z"
                                />
                                <path
                                    d="M42.4,5.6c1,1,1.5,2.4,1.5,4.4c0,1.9-0.4,3.4-1.3,4.6s-2.3,1.8-4.2,1.8c-1.6,0-2.8-0.5-3.7-1.6c-0.9-1.1-1.4-2.5-1.4-4.3
                      c0-1.9,0.5-3.5,1.5-4.6c1-1.1,2.3-1.7,3.9-1.7C40.2,4.2,41.4,4.7,42.4,5.6z M41.2,13.3c0.5-1,0.7-2,0.7-3.2c0-1.1-0.2-1.9-0.5-2.6
                      c-0.5-1.1-1.5-1.6-2.8-1.6c-1.2,0-2,0.5-2.5,1.4c-0.5,0.9-0.8,2-0.8,3.3c0,1.2,0.3,2.2,0.8,3.1c0.5,0.8,1.4,1.2,2.5,1.2
                      C39.9,14.7,40.8,14.3,41.2,13.3z"
                                />
                                <path
                                    d="M46.4,4.5h1.8v2c0.2-0.4,0.5-0.9,1.1-1.4c0.6-0.6,1.3-0.8,2-0.8c0,0,0.1,0,0.2,0s0.2,0,0.4,0v2c-0.1,0-0.2,0-0.3,0
                      s-0.2,0-0.3,0c-1,0-1.7,0.3-2.2,0.9c-0.5,0.6-0.8,1.3-0.8,2.2V16h-1.9V4.5z"
                                />
                                <path
                                    d="M2.7,36.9c0,0.9,0.3,1.6,0.6,2.2c0.7,1,1.9,1.6,3.6,1.6c0.8,0,1.5-0.1,2.1-0.3c1.2-0.4,1.8-1.2,1.8-2.4
                      c0-0.9-0.3-1.5-0.8-1.8c-0.5-0.4-1.4-0.7-2.5-0.9l-2.1-0.5c-1.4-0.3-2.3-0.7-2.9-1c-1-0.7-1.5-1.6-1.5-3c0-1.4,0.5-2.6,1.4-3.5
                      s2.3-1.4,4.1-1.4c1.6,0,3,0.4,4.1,1.2c1.1,0.8,1.7,2.1,1.7,3.8h-2c-0.1-0.8-0.3-1.5-0.7-1.9c-0.6-0.8-1.7-1.2-3.2-1.2
                      c-1.2,0-2.1,0.3-2.6,0.8s-0.8,1.1-0.8,1.8c0,0.8,0.3,1.3,0.9,1.7c0.4,0.2,1.3,0.5,2.8,0.9l2.1,0.5c1,0.2,1.8,0.6,2.4,1
                      c1,0.7,1.5,1.8,1.5,3.2c0,1.7-0.6,3-1.9,3.7s-2.7,1.1-4.3,1.1c-1.9,0-3.4-0.5-4.5-1.5c-1.1-1-1.6-2.3-1.6-4H2.7z"
                                />
                                <path
                                    d="M24.1,31.6c1,1,1.5,2.4,1.5,4.4c0,1.9-0.4,3.4-1.3,4.6s-2.3,1.8-4.2,1.8c-1.6,0-2.8-0.5-3.7-1.6c-0.9-1.1-1.4-2.5-1.4-4.3
                      c0-1.9,0.5-3.5,1.5-4.6c1-1.1,2.3-1.7,3.9-1.7C21.8,30.2,23.1,30.7,24.1,31.6z M22.9,39.3c0.5-1,0.7-2,0.7-3.2
                      c0-1.1-0.2-1.9-0.5-2.6c-0.5-1.1-1.5-1.6-2.8-1.6c-1.2,0-2,0.5-2.5,1.4c-0.5,0.9-0.8,2-0.8,3.3c0,1.2,0.3,2.2,0.8,3.1
                      c0.5,0.8,1.4,1.2,2.5,1.2C21.5,40.7,22.4,40.3,22.9,39.3z"
                                />
                                <path
                                    d="M35.6,31.1c0.8,0.6,1.3,1.7,1.5,3.3h-1.9c-0.1-0.7-0.4-1.3-0.8-1.8c-0.4-0.5-1.1-0.7-2-0.7c-1.2,0-2.1,0.6-2.6,1.8
                      c-0.3,0.8-0.5,1.7-0.5,2.9c0,1.2,0.2,2.1,0.7,2.9c0.5,0.8,1.3,1.2,2.3,1.2c0.8,0,1.4-0.2,1.9-0.7c0.5-0.5,0.8-1.2,1-2h1.9
                      c-0.2,1.5-0.8,2.6-1.6,3.3c-0.9,0.7-2,1.1-3.3,1.1c-1.5,0-2.7-0.5-3.6-1.6c-0.9-1.1-1.3-2.5-1.3-4.1c0-2,0.5-3.6,1.5-4.7
                      c1-1.1,2.2-1.7,3.7-1.7C33.7,30.2,34.8,30.5,35.6,31.1z"
                                />
                                <path d="M39,26.2h2v2.2h-2V26.2z M39,30.6h2V42h-2V30.6z" />
                                <path
                                    d="M50,35c0.4-0.1,0.7-0.2,0.9-0.6c0.1-0.2,0.1-0.4,0.1-0.7c0-0.7-0.2-1.1-0.7-1.4c-0.5-0.3-1.1-0.4-2-0.4
                      c-1,0-1.7,0.3-2.1,0.8C46,33,45.8,33.4,45.7,34h-1.8c0-1.4,0.5-2.4,1.4-3c0.9-0.6,1.9-0.8,3.1-0.8c1.4,0,2.4,0.3,3.3,0.8
                      c0.8,0.5,1.3,1.3,1.3,2.4V40c0,0.2,0,0.4,0.1,0.5c0.1,0.1,0.3,0.2,0.5,0.2c0.1,0,0.2,0,0.3,0c0.1,0,0.2,0,0.3,0v1.4
                      c-0.3,0.1-0.5,0.1-0.7,0.2c-0.2,0-0.4,0-0.6,0c-0.7,0-1.1-0.2-1.5-0.7c-0.2-0.2-0.3-0.6-0.3-1.1c-0.4,0.5-1,1-1.7,1.3
                      c-0.7,0.4-1.6,0.6-2.4,0.6c-1.1,0-1.9-0.3-2.6-1c-0.7-0.6-1-1.5-1-2.4c0-1.1,0.3-1.9,1-2.5c0.7-0.6,1.5-0.9,2.6-1.1L50,35z M46,40.3
                      c0.4,0.3,0.9,0.5,1.5,0.5c0.7,0,1.3-0.2,2-0.5c1.1-0.5,1.6-1.4,1.6-2.6v-1.6c-0.2,0.2-0.5,0.3-0.9,0.4s-0.7,0.2-1.1,0.2l-1.2,0.2
                      c-0.7,0.1-1.2,0.2-1.6,0.4c-0.6,0.3-0.9,0.9-0.9,1.6C45.4,39.5,45.6,39.9,46,40.3z"
                                />
                                <path d="M56.2,26.2h1.9V42h-1.9V26.2z" />
                                <path
                                    d="M77.9,26.7c1.5,0.8,2.5,2.3,2.8,4.3h-2.1c-0.3-1.2-0.8-2-1.6-2.5c-0.8-0.5-1.8-0.8-3-0.8c-1.4,0-2.6,0.5-3.6,1.6
                      c-1,1.1-1.5,2.7-1.5,4.9c0,1.9,0.4,3.4,1.2,4.6c0.8,1.2,2.1,1.8,3.9,1.8c1.4,0,2.6-0.4,3.5-1.2c0.9-0.8,1.4-2.2,1.4-4H74v-1.8H81V42
                      h-1.4l-0.5-2c-0.7,0.8-1.3,1.3-1.9,1.7c-0.9,0.5-2.1,0.8-3.5,0.8c-1.8,0-3.4-0.6-4.7-1.8c-1.4-1.5-2.2-3.6-2.2-6.3
                      c0-2.6,0.7-4.7,2.1-6.3c1.3-1.5,3.1-2.2,5.2-2.2C75.5,25.8,76.8,26.1,77.9,26.7z"
                                />
                                <path
                                    d="M92.6,31.6c1,1,1.5,2.4,1.5,4.4c0,1.9-0.4,3.4-1.3,4.6c-0.9,1.2-2.3,1.8-4.2,1.8c-1.6,0-2.8-0.5-3.7-1.6
                      c-0.9-1.1-1.4-2.5-1.4-4.3c0-1.9,0.5-3.5,1.5-4.6c1-1.1,2.3-1.7,3.9-1.7C90.3,30.2,91.5,30.7,92.6,31.6z M91.4,39.3
                      c0.5-1,0.7-2,0.7-3.2c0-1.1-0.2-1.9-0.5-2.6c-0.5-1.1-1.5-1.6-2.8-1.6c-1.2,0-2,0.5-2.5,1.4c-0.5,0.9-0.8,2-0.8,3.3
                      c0,1.2,0.3,2.2,0.8,3.1c0.5,0.8,1.4,1.2,2.5,1.2C90,40.7,90.9,40.3,91.4,39.3z"
                                />
                                <path
                                    d="M104.8,31.6c1,1,1.5,2.4,1.5,4.4c0,1.9-0.4,3.4-1.3,4.6c-0.9,1.2-2.3,1.8-4.2,1.8c-1.6,0-2.8-0.5-3.7-1.6
                      c-0.9-1.1-1.4-2.5-1.4-4.3c0-1.9,0.5-3.5,1.5-4.6c1-1.1,2.3-1.7,3.9-1.7C102.5,30.2,103.8,30.7,104.8,31.6z M103.6,39.3
                      c0.5-1,0.7-2,0.7-3.2c0-1.1-0.2-1.9-0.5-2.6c-0.5-1.1-1.5-1.6-2.8-1.6c-1.2,0-2,0.5-2.5,1.4c-0.5,0.9-0.8,2-0.8,3.3
                      c0,1.2,0.3,2.2,0.8,3.1c0.5,0.8,1.4,1.2,2.5,1.2C102.3,40.7,103.1,40.3,103.6,39.3z"
                                />
                                <path
                                    d="M115,30.9c0.3,0.2,0.7,0.6,1.2,1.1v-5.8h1.9V42h-1.7v-1.6c-0.4,0.7-1,1.2-1.6,1.5c-0.6,0.3-1.3,0.5-2.1,0.5
                      c-1.3,0-2.4-0.5-3.3-1.6c-0.9-1.1-1.4-2.5-1.4-4.3c0-1.7,0.4-3.1,1.3-4.4c0.9-1.2,2.1-1.8,3.7-1.8C113.7,30.3,114.4,30.5,115,30.9z
                        M110.7,39.5c0.5,0.8,1.4,1.2,2.5,1.2c0.9,0,1.6-0.4,2.2-1.2c0.6-0.8,0.9-1.9,0.9-3.3c0-1.5-0.3-2.5-0.9-3.2c-0.6-0.7-1.3-1-2.2-1
                      c-1,0-1.8,0.4-2.4,1.1c-0.6,0.7-0.9,1.8-0.9,3.3C109.9,37.6,110.2,38.7,110.7,39.5z"
                                />
                            </svg>
                        </div>
                        <div class="divider"></div>
                        <div class="google">
                            <svg
                                version="1.1"
                                id="Layer_1"
                                xmlns="http://www.w3.org/2000/svg"
                                xmlns:xlink="http://www.w3.org/1999/xlink"
                                x="0px"
                                y="0px"
                                viewBox="0 0 98 67"
                                style="enable-background:new 0 0 98 67;"
                                xml:space="preserve"
                            >
                                <style type="text/css">
                                    .st0 {
                                        fill: #ffffff;
                                    }
                                </style>
                                <path
                                    id="Fill-2"
                                    class="st0"
                                    d="M15.4,6.2c0-1-0.6-1.8-1.7-1.8c-1,0-1.6,0.8-1.6,1.8S12.7,8,13.7,8C14.7,8,15.4,7.2,15.4,6.2
                      L15.4,6.2z M16.7,3.4V9h-1.3V8.2c-0.3,0.6-1.1,0.9-1.7,0.9c-1.7,0-2.9-1.3-2.9-2.9c0-1.6,1.2-2.9,2.9-2.9c0.6,0,1.4,0.3,1.7,0.9V3.4
                      H16.7L16.7,3.4z"
                                />
                                <path
                                    id="Fill-4"
                                    class="st0"
                                    d="M22.5,6.2c0-1-0.6-1.8-1.7-1.8c-1,0-1.6,0.8-1.6,1.8S19.9,8,20.9,8C21.9,8,22.5,7.2,22.5,6.2
                      L22.5,6.2z M22.5,8.2c-0.3,0.6-1.1,0.9-1.7,0.9c-1.7,0-2.9-1.3-2.9-2.9c0-1.6,1.2-2.9,2.9-2.9c0.6,0,1.4,0.3,1.7,0.9V0.6h1.3V9h-1.3
                      V8.2z"
                                />
                                <path
                                    id="Fill-6"
                                    class="st0"
                                    d="M26.5,5.6h2.7c0-0.8-0.6-1.3-1.4-1.3C27.1,4.4,26.5,4.8,26.5,5.6L26.5,5.6z M26.5,6.6
                      c0,0.8,0.4,1.4,1.5,1.4c0.7,0,1-0.3,1.2-0.7h1.3c-0.2,1-1.1,1.8-2.5,1.8c-1.9,0-2.8-1.4-2.8-2.9c0-1.7,1-2.9,2.8-2.9
                      c1.4,0,2.6,1.1,2.6,2.5c0,0.2,0,0.5-0.1,0.8H26.5z"
                                />
                                <polygon
                                    id="Fill-8"
                                    class="st0"
                                    points="38.4,4.8 36.9,9 36.1,9 33.9,3.4 35.3,3.4 36.5,6.9 37.8,3.4 39.1,3.4 40.3,6.9 41.5,3.4 
                      42.9,3.4 40.8,9 39.9,9 "
                                />
                                <path
                                    id="Fill-10"
                                    class="st0"
                                    d="M44,9h1.3V3.4H44V9z M44.7,0.4c0.5,0,1,0.4,1,1c0,0.5-0.4,1-1,1c-0.5,0-1-0.4-1-1
                      C43.7,0.9,44.1,0.4,44.7,0.4L44.7,0.4z"
                                />
                                <path
                                    id="Fill-12"
                                    class="st0"
                                    d="M50.4,9c-0.2,0-0.6,0.1-1,0.1c-0.6,0-1.8-0.1-1.8-2V4.5h-0.9V3.4h0.9V1.7h1.3v1.7h1.3v1.1h-1.3
                      v2.3c0,1,0.3,1.1,0.8,1.1c0.2,0,0.5,0,0.7,0V9z"
                                />
                                <path
                                    id="Fill-13"
                                    class="st0"
                                    d="M51.4,0.6h1.3v3.6c0.3-0.6,1-0.9,1.8-0.9c0.8,0,1.4,0.3,1.7,0.8c0.3,0.4,0.4,0.9,0.4,1.6V9h-1.3
                      V6.1c0-1-0.3-1.7-1.2-1.7c-0.9,0-1.3,0.7-1.3,1.7V9h-1.3V0.6z"
                                />
                                <path
                                    id="Fill-14"
                                    class="st0"
                                    d="M5.6,19.9c0,1.2-1,1.7-2.2,1.7c-1.2,0-2.3-0.7-2.3-2h1.3c0,0.7,0.5,1,1.1,1c0.5,0,0.9-0.2,0.9-0.6
                      c0-0.5-0.6-0.6-1.7-1c-0.8-0.3-1.3-0.6-1.3-1.6c0-1.1,1-1.6,2.1-1.6c1.2,0,2.1,0.8,2.1,1.9H4.2c0-0.5-0.3-0.9-0.9-0.9
                      c-0.4,0-0.8,0.2-0.8,0.6c0,0.5,0.5,0.5,1.5,0.9C4.8,18.6,5.6,18.9,5.6,19.9"
                                />
                                <path
                                    id="Fill-15"
                                    class="st0"
                                    d="M11.1,18.7c0-1-0.6-1.8-1.7-1.8c-1,0-1.6,0.8-1.6,1.8s0.6,1.8,1.6,1.8
                      C10.4,20.5,11.1,19.6,11.1,18.7 M6.5,18.7c0-1.6,1.2-2.9,2.9-2.9c1.8,0,3,1.3,3,2.9c0,1.6-1.2,2.9-3,2.9C7.7,21.6,6.5,20.3,6.5,18.7
                      "
                                />
                                <path
                                    id="Fill-16"
                                    class="st0"
                                    d="M20.7,21.5v-3.1c0-0.9-0.3-1.4-1-1.4c-0.7,0-1.2,0.4-1.2,1.7v2.8h-1.3v-3.1c0-0.9-0.3-1.4-1-1.4
                      c-0.7,0-1.2,0.4-1.2,1.7v2.8h-1.3v-5.6H15v0.8c0.2-0.5,0.8-0.9,1.6-0.9c1,0,1.5,0.4,1.8,1c0.3-0.6,0.9-1,1.7-1c1.7,0,2,1.1,2,2.2
                      v3.5H20.7z"
                                />
                                <path
                                    id="Fill-17"
                                    class="st0"
                                    d="M24.6,18.1h2.7c0-0.8-0.6-1.3-1.4-1.3C25.2,16.9,24.6,17.3,24.6,18.1L24.6,18.1z M24.5,19.1
                      c0,0.8,0.4,1.4,1.5,1.4c0.7,0,1-0.3,1.2-0.7h1.3c-0.2,1-1.1,1.8-2.5,1.8c-1.9,0-2.8-1.4-2.8-2.9c0-1.7,1-2.9,2.8-2.9
                      c1.4,0,2.6,1.1,2.6,2.5c0,0.2,0,0.5-0.1,0.8H24.5z"
                                />
                                <path
                                    id="Fill-18"
                                    class="st0"
                                    d="M36.1,14.3c-0.2,0-0.4-0.1-0.6-0.1c-0.4,0-0.9,0-0.9,0.9v0.8h1.5V17h-1.5v4.5h-1.3V17h-1.1v-1.1
                      h1.1v-0.7c0-2.1,1.4-2.2,2-2.2c0.3,0,0.6,0.1,0.8,0.1V14.3z"
                                />
                                <path
                                    id="Fill-19"
                                    class="st0"
                                    d="M40.6,17.1c-0.2,0-0.3-0.1-0.5-0.1c-1.1,0-1.7,0.6-1.7,2v2.4h-1.3v-5.6h1.3v0.9c0.3-0.5,1-1,1.7-1
                      c0.2,0,0.4,0,0.5,0.1V17.1z"
                                />
                                <path
                                    id="Fill-20"
                                    class="st0"
                                    d="M41.8,21.5h1.3v-5.6h-1.3V21.5z M42.5,12.9c0.5,0,1,0.4,1,1c0,0.5-0.4,1-1,1c-0.5,0-1-0.4-1-1
                      C41.5,13.3,41.9,12.9,42.5,12.9L42.5,12.9z"
                                />
                                <path
                                    id="Fill-21"
                                    class="st0"
                                    d="M46,18.1h2.7c0-0.8-0.6-1.3-1.4-1.3C46.6,16.9,46,17.3,46,18.1L46,18.1z M46,19.1
                      c0,0.8,0.4,1.4,1.5,1.4c0.7,0,1-0.3,1.2-0.7H50c-0.2,1-1.1,1.8-2.5,1.8c-1.9,0-2.8-1.4-2.8-2.9c0-1.7,1-2.9,2.8-2.9
                      c1.4,0,2.6,1.1,2.6,2.5c0,0.2,0,0.5-0.1,0.8H46z"
                                />
                                <path
                                    id="Fill-22"
                                    class="st0"
                                    d="M51.4,15.9h1.3v0.8c0.3-0.6,1-0.9,1.8-0.9c0.8,0,1.4,0.3,1.7,0.8c0.3,0.4,0.4,0.9,0.4,1.6v3.3
                      h-1.3v-2.9c0-1-0.3-1.7-1.2-1.7c-0.9,0-1.3,0.7-1.3,1.7v2.9h-1.3V15.9z"
                                />
                                <path
                                    id="Fill-23"
                                    class="st0"
                                    d="M62.3,18.7c0-1-0.6-1.8-1.7-1.8c-1,0-1.6,0.8-1.6,1.8s0.6,1.8,1.6,1.8
                      C61.7,20.5,62.3,19.6,62.3,18.7L62.3,18.7z M62.3,20.7c-0.3,0.6-1.1,0.9-1.7,0.9c-1.7,0-2.9-1.3-2.9-2.9c0-1.6,1.2-2.9,2.9-2.9
                      c0.6,0,1.4,0.3,1.7,0.9v-3.5h1.3v8.4h-1.3V20.7z"
                                />
                                <path
                                    id="Fill-24"
                                    class="st0"
                                    d="M69.4,19.9c0,1.2-1,1.7-2.2,1.7c-1.2,0-2.3-0.7-2.3-2h1.3c0,0.7,0.5,1,1.1,1
                      c0.5,0,0.9-0.2,0.9-0.6c0-0.5-0.6-0.6-1.7-1c-0.8-0.3-1.3-0.6-1.3-1.6c0-1.1,1-1.6,2.1-1.6c1.2,0,2.1,0.8,2.1,1.9H68
                      c0-0.5-0.3-0.9-0.9-0.9c-0.4,0-0.8,0.2-0.8,0.6c0,0.5,0.5,0.5,1.5,0.9C68.6,18.6,69.4,18.9,69.4,19.9"
                                />
                                <path
                                    id="Fill-25"
                                    class="st0"
                                    d="M76.9,14.3c-0.2,0-0.4-0.1-0.6-0.1c-0.4,0-0.9,0-0.9,0.9v0.8h1.5V17h-1.5v4.5h-1.3V17H73v-1.1h1.1
                      v-0.7c0-2.1,1.4-2.2,2-2.2c0.3,0,0.6,0.1,0.8,0.1V14.3z"
                                />
                                <path
                                    id="Fill-26"
                                    class="st0"
                                    d="M81.4,17.1c-0.2,0-0.3-0.1-0.5-0.1c-1.1,0-1.7,0.6-1.7,2v2.4h-1.3v-5.6h1.3v0.9c0.3-0.5,1-1,1.7-1
                      c0.2,0,0.4,0,0.5,0.1V17.1z"
                                />
                                <path
                                    id="Fill-27"
                                    class="st0"
                                    d="M86.2,18.7c0-1-0.6-1.8-1.7-1.8c-1,0-1.6,0.8-1.6,1.8s0.6,1.8,1.6,1.8
                      C85.6,20.5,86.2,19.6,86.2,18.7 M81.6,18.7c0-1.6,1.2-2.9,2.9-2.9c1.8,0,3,1.3,3,2.9c0,1.6-1.2,2.9-3,2.9
                      C82.8,21.6,81.6,20.3,81.6,18.7"
                                />
                                <path
                                    id="Fill-28"
                                    class="st0"
                                    d="M95.8,21.5v-3.1c0-0.9-0.3-1.4-1-1.4c-0.7,0-1.2,0.4-1.2,1.7v2.8h-1.3v-3.1c0-0.9-0.3-1.4-1-1.4
                      c-0.7,0-1.2,0.4-1.2,1.7v2.8h-1.3v-5.6h1.3v0.8c0.2-0.5,0.8-0.9,1.6-0.9c1,0,1.5,0.4,1.8,1c0.3-0.6,0.9-1,1.7-1c1.7,0,2,1.1,2,2.2
                      v3.5H95.8z"
                                />
                                <polygon
                                    id="Fill-1"
                                    class="st0"
                                    points="9.7,8.4 8.2,8.4 8.2,3.2 6,8.4 4.9,8.4 2.7,3.2 2.7,8.4 1.3,8.4 1.3,0 2.7,0 5.5,6.2 
                      8.3,0 9.7,0 "
                                />
                                <path
                                    id="Fill-29"
                                    class="st0"
                                    d="M35.2,52.4c0-2.6-1.9-4.4-4.1-4.4c-2.2,0-4.1,1.8-4.1,4.4c0,2.6,1.9,4.4,4.1,4.4
                      C33.3,56.8,35.2,55,35.2,52.4 M38.4,52.4c0,4.2-3.3,7.3-7.3,7.3c-4,0-7.3-3.1-7.3-7.3c0-4.2,3.3-7.3,7.3-7.3
                      C35.1,45.1,38.4,48.2,38.4,52.4"
                                />
                                <path
                                    id="Fill-30"
                                    class="st0"
                                    d="M51.1,52.4c0-2.6-1.9-4.4-4.1-4.4c-2.2,0-4.1,1.8-4.1,4.4c0,2.6,1.9,4.4,4.1,4.4
                      C49.2,56.8,51.1,55,51.1,52.4 M54.3,52.4c0,4.2-3.3,7.3-7.3,7.3c-4,0-7.3-3.1-7.3-7.3c0-4.2,3.3-7.3,7.3-7.3
                      C51,45.1,54.3,48.2,54.3,52.4"
                                />
                                <path
                                    id="Fill-31"
                                    class="st0"
                                    d="M66.8,52.4c0-2.6-1.7-4.4-3.9-4.4c-2.2,0-4.1,1.9-4.1,4.4c0,2.5,1.9,4.4,4.1,4.4
                      C65.1,56.8,66.8,55,66.8,52.4L66.8,52.4z M69.6,45.6v13c0,5.4-3.2,7.6-6.9,7.6c-3.5,0-5.7-2.4-6.5-4.3l2.8-1.2
                      c0.5,1.2,1.7,2.6,3.7,2.6c2.4,0,3.9-1.5,3.9-4.3v-1h-0.1c-0.7,0.9-2.1,1.7-3.8,1.7c-3.6,0-7-3.2-7-7.2c0-4.1,3.3-7.3,7-7.3
                      c1.7,0,3.1,0.8,3.8,1.6h0.1v-1.2H69.6z"
                                />
                                <polygon id="Fill-32" class="st0" points="71.8,59.2 75,59.2 75,37.9 71.8,37.9 " />
                                <path
                                    id="Fill-33"
                                    class="st0"
                                    d="M79.5,52.2l6.5-2.7c-0.4-0.9-1.4-1.5-2.7-1.5C81.7,47.9,79.4,49.4,79.5,52.2 M87.1,54.8l2.5,1.7
                      c-0.8,1.2-2.7,3.2-6.1,3.2c-4.1,0-7.2-3.2-7.2-7.3c0-4.3,3-7.3,6.8-7.3c3.8,0,5.6,3,6.2,4.6l0.3,0.8l-9.8,4c0.7,1.5,1.9,2.2,3.5,2.2
                      C85.2,56.8,86.3,56,87.1,54.8"
                                />
                                <path
                                    id="Fill-34"
                                    class="st0"
                                    d="M12.2,59.7c-6.2,0-11.5-5.1-11.5-11.3s5.3-11.3,11.5-11.3c3.5,0,5.9,1.3,7.8,3.1l-2.2,2.2
                      c-1.3-1.2-3.1-2.2-5.6-2.2c-4.6,0-8.1,3.7-8.1,8.2s3.6,8.2,8.1,8.2c3,0,4.6-1.2,5.7-2.3c0.9-0.9,1.5-2.1,1.7-3.9h-7.4v-3.1h10.4
                      c0.1,0.6,0.2,1.2,0.2,1.9c0,2.3-0.6,5.2-2.7,7.2C18.1,58.6,15.5,59.7,12.2,59.7"
                                />
                            </svg>
                        </div>
                    </a>
                </div>
                <div id="tands">
                    <a href="https://policies.google.com/privacy" target="_blank">Privacy</a> 
                    &amp; 
                    <a href="https://policies.google.com/terms" target="_blank">Terms</a>
                </div>
            </div>
        `
    }
}
