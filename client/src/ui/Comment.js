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
import { Config, Globals } from '../globals'
import './CommentsModal'
import './CommentMarkdownElement'
const fadeTime = 160

export class Comment extends LitElement {
    static get properties() {
        return {
            author: { type: String },
            open: { type: Boolean },
            disabled: { type: Boolean },
            authorObj: { type: Object },
            visibleAnnotation: { type: Object },
            firstCommentSelectable: { type: Boolean },
            lastCommentSelectable: { type: Boolean },
            showAuthorOverlay: { type: Boolean },
            showing: { type: Boolean },
        }
    }

    constructor() {
        super()
        this.open = false
        this._annotation = null
        this.authorObj = null
        this.visibleAnnotation = this._annotation
        this.nextCommentEvent = new CustomEvent('nextComment')
        this.prevCommentEvent = new CustomEvent('prevComment')
        this.firstCommentSelectable = true
        this.lastCommentSelectable = true
        this.disabled = false
        this.showAuthorOverlay = false
    }

    set annotation(annotation) {
        this._annotation = annotation
        if (this.$$body) {
            // empty annotation object closes comment
            if (this.annotation !== null) {
                this.visibleAnnotation = this.annotation
                this.$$body.classList.remove('hidden')
                clearTimeout(this.fadeoutTimeout)
            } else {
                this.fadeoutTimeout = setTimeout(() => {
                    this.visibleAnnotation = this.annotation
                }, fadeTime)
                this.$$body.classList.add('hidden')
            }
        }
    }

    get annotation() {
        return this._annotation
    }

    firstUpdated() {
        this.$$container = this.shadowRoot.querySelector('#container')
        this.$$body = this.shadowRoot.querySelector('#body')
        document.addEventListener('click', (event) => {
            this.bgClickHandler(event)
        })
        document.addEventListener('touchend', (event) => {
            this.bgClickHandler(event)
        })
    }

    bgClickHandler(event) {
        const path = path || (event.composedPath && event.composedPath())
        if (this.open && path && path[0]) {
            if (!this.shadowRoot.contains(path[0])) {
                this.open = false
            }
        }
    }

    set author(author) {
        this._author = author
        if (this.author !== null) {
            this.authorObj = Config.authors[this.author]
        } else {
            this.authorObj = null
        }
        this.open = false
        const event = new CustomEvent('authorChange', { detail: this.authorObj })
        this.dispatchEvent(event)
        console.log('authorChange', { detail: this.authorObj })
    }

    get author() {
        return this._author
    }

    handleAuthorClick(e) {
        const key = e.currentTarget.getAttribute('data-author')
        this.shadowRoot.querySelector('comments-modal').author = Config.authors[key]
        this.shadowRoot.querySelector('comments-modal').show = true
        this.open = false
    }

    startTour(author) {
        this.shadowRoot.querySelector('comments-modal').author = Config.authors[author]
        this.shadowRoot.querySelector('comments-modal').show = true
        this.open = false
    }

    beginTourHandler(e) {
        this.author = e.detail.author.id
    }

    nextComment() {
        this.dispatchEvent(this.nextCommentEvent)
    }
    prevComment() {
        this.dispatchEvent(this.prevCommentEvent)
    }

    hide() {
        this.showing = false
    }

    show() {
        this.showing = true
    }

    render() {
        if (!this.showing) {
            return html``
        }

        return html`
            <div id="container" class="${this.open ? 'scroll open' : ''} ${this.disabled ? 'disabled' : ''}">
                <div class="header-wrap">
                    <div class="header">
                        <button
                            class="share-close ${this.open ? '' : 'hide'}"
                            @click=${(e) => {
                                this.author = null
                                this.open = false
                            }}
                        >
                            <div class="share-close-text">
                                Close
                            </div>
                            <div class="share-close-icon">
                                <span></span>
                                <span></span>
                            </div>
                        </button>
                        <div class="button-group">
                            <button
                                class="tutorial-previous${this.authorObj === null || !this.firstCommentSelectable
                                    ? ' hide'
                                    : ''}"
                                @click=${this.prevComment}
                            >
                                <!-- Generator: Adobe Illustrator 22.1.0, SVG Export Plug-In . SVG Version: 6.00 Build 0)  -->
                                <svg
                                    version="1.1"
                                    id="Layer_1"
                                    xmlns="http://www.w3.org/2000/svg"
                                    xmlns:xlink="http://www.w3.org/1999/xlink"
                                    x="0px"
                                    y="0px"
                                    viewBox="0 0 16.5 26"
                                    style="enable-background:new 0 0 16.5 26;"
                                    xml:space="preserve"
                                >
                                    <style type="text/css">
                                        .st0 {
                                            fill: #ffffff;
                                        }
                                    </style>
                                    <polygon class="st0" points="0.9,26 0,25 14.4,13 0,1 0.9,0 16.5,13 " />
                                </svg>
                            </button>

                            <button
                                class="author-toggle${!Globals.controls.loaded ? ' disabled' : ''}"
                                id="selected"
                                @click=${(e) => {
                                    this.open = !this.open
                                }}
                            >
                                ${this.authorObj && this.authorObj.hasOwnProperty('name')
                                    ? html`
                                          <img
                                              class="author-img-small"
                                              src="${this.authorObj.image}"
                                              alt="${this.authorObj.alt}"
                                          />
                                          <span class="author-toggle-text">${this.authorObj.name}</span>
                                          <span class="author-toggle-arrow"></span>
                                      `
                                    : html`
                                          <span class="icon-comments">
                                              <!-- Generator: Adobe Illustrator 22.1.0, SVG Export Plug-In . SVG Version: 6.00 Build 0)  -->
                                              <svg
                                                  version="1.1"
                                                  id="Layer_1"
                                                  xmlns="http://www.w3.org/2000/svg"
                                                  xmlns:xlink="http://www.w3.org/1999/xlink"
                                                  x="0px"
                                                  y="0px"
                                                  viewBox="0 0 29 27.8"
                                                  style="enable-background:new 0 0 29 27.8;"
                                                  xml:space="preserve"
                                              >
                                                  <style type="text/css">
                                                      .st0 {
                                                          fill: #ffffff;
                                                      }
                                                  </style>
                                                  <path
                                                      class="st0"
                                                      d="M29,27.8L22,20H0V0h29V27.8z M1,19h21.5l5.5,6.1V1H1V19z"
                                                  />
                                                  <rect x="8" y="6" class="st0" width="13" height="2" />
                                                  <rect x="8" y="12" class="st0" width="13" height="2" />
                                              </svg>
                                          </span>
                                          <span class="author-toggle-text">Select tour</span>
                                          <span class="author-toggle-arrow"></span>
                                      `}
                            </button>
                            <button
                                class="tutorial-next${this.authorObj === null || !this.lastCommentSelectable
                                    ? ' hide'
                                    : ''}"
                                @click=${this.nextComment}
                            >
                                <svg
                                    version="1.1"
                                    id="Layer_1"
                                    xmlns="http://www.w3.org/2000/svg"
                                    xmlns:xlink="http://www.w3.org/1999/xlink"
                                    x="0px"
                                    y="0px"
                                    viewBox="0 0 16.5 26"
                                    style="enable-background:new 0 0 16.5 26;"
                                    xml:space="preserve"
                                >
                                    <style type="text/css">
                                        .st0 {
                                            fill: #ffffff;
                                        }
                                    </style>
                                    <polygon class="st0" points="0.9,26 0,25 14.4,13 0,1 0.9,0 16.5,13 " />
                                </svg>
                            </button>
                        </div>
                    </div>
                    ${this.open
                        ? html`
                              <ul class="authors-list">
                                  <div class="mobile-authors-list-title">Commenters</div>
                                  <li class="list-item">
                                      <button
                                          class="close-list"
                                          @click=${(e) => {
                                              this.author = null
                                              this.annotation = null
                                              this.visibleAnnotation = null
                                              this.open = false
                                          }}
                                      >
                                          <div class="close">
                                              <span></span>
                                              <span></span>
                                          </div>
                                          <div class="text">
                                              <p class="name">No tour</p>
                                          </div>
                                      </button>
                                  </li>
                                  ${Object.values(Config.authors).map(
                                      (author) => html`
                                          <li class="list-item">
                                              <button
                                                  class="author-wrap"
                                                  data-author=${author.id}
                                                  @click=${this.handleAuthorClick}
                                              >
                                                  <img class="-small" src=${author.image} alt=${author.alt} />
                                                  <div class="text">
                                                      <p class="name">${author.name}</p>
                                                      <p class="title">${author.title}</p>
                                                  </div>
                                              </button>
                                          </li>
                                      `
                                  )}
                              </ul>
                          `
                        : html``}
                </div>
                <div id="body" class="body">
                    ${this.visibleAnnotation !== null && !this.open
                        ? html`
                              <comment-markdown-element
                                  class="comment"
                                  markdown=${this.visibleAnnotation.comment || '(no comment)'}
                              ></comment-markdown-element>
                          `
                        : html``}
                </div>
            </div>
            <comments-modal
                @close=${(e) => {
                    this.showAuthorOverlay = false
                }}
                @begin=${this.beginTourHandler}
            ></comments-modal>
        `
    }

    static get styles() {
        return css`
            p {
                margin: 0;
            }

            .button-group {
                position: relative;
                display: flex;
                justify-content: center;
                align-items: center;
            }

            #container {
                display: block;
                z-index: 3;
                pointer-events: none;
                position: absolute;
                top: 35px;
                text-align: center;
                width: 100%;
                background: black;
            }
            .hidden {
                visibility: hidden;
                opacity: 0;
            }

            .header-wrap {
                position: relative;
            }

            .header {
                display: inline-block;
                margin-bottom: 5px;
                position: relative;
            }

            .tutorial-previous,
            .tutorial-next {
                background: none;
                border: none;
                width: 15px;
                height: 15px;
                position: relative;
                cursor: pointer;
                position: relative;
                margin: -10px 10px 0;
                opacity: 1;
                transition: all 0.25s ease-out;
            }

            .tutorial-next:active {
                opacity: 0.6;
            }

            .tutorial-previous:active {
                opacity: 0.6;
            }

            .open .tutorial-previous,
            .open .tutorial-next {
                display: none;
            }

            .tutorial-previous {
                transform: scale(-1, 1);
            }

            .tutorial-previous.hide,
            .tutorial-next.hide {
                opacity: 0;
                pointer-events: none;
            }

            .tutorial-previous svg,
            .tutorial-next svg {
                height: 100%;
                width: 15px;
                height: 15px;
                padding: 10px;
                position: absolute;
                left: -5px;
                top: -5px;
            }

            .author-toggle {
                background: none;
                border: 0;
                color: #fff;
                padding: 7px 10px;
                border: 1px solid #fff;
                display: flex;
                align-items: center;
                cursor: pointer;
                transition: 0.2s ease-in;
                width: 290px;
                height: 42px;
                position: relative;
            }

            .author-toggle:hover {
                background: rgb(47, 47, 47);
            }

            .author-img-small {
                height: 24px;
                width: 24px;
                overflow: hidden;
                object-fit: cover;
                border-radius: 50%;
            }

            .icon-comments {
                height: 20px;
                width: 20px;
                position: relative;
                top: 2px;
            }

            .icon-comments svg {
                width: 100%;
                height: 100%;
            }

            .author-toggle-text {
                margin-left: 16px;
                font-weight: 500;
                font-family: 'Roboto Mono', monospace;
                letter-spacing: 1px;
                font-size: 14px;
            }

            .author-toggle-arrow {
                height: 9px;
                width: 9px;
                border-left: 1px solid #fff;
                border-bottom: 1px solid #fff;
                display: inline-block;
                transform: rotate(-45deg);
                position: absolute;
                right: 20px;
                top: 12px;
            }

            .open .author-toggle-arrow {
                top: 16px;
                transform: rotate(135deg);
            }

            .icon {
                display: inline-block;
                vertical-align: top;
            }

            .authors-list {
                display: flex;
                flex-direction: column;
                padding-left: 0;
                margin-top: 5px;
                max-height: calc(100vh - 100px);
                overflow-y: auto;
                pointer-events: auto;
                border-bottom: 1px solid #fff;
                border-top: 1px solid #fff;
                width: 400px;
                position: absolute;
                margin-left: -145px;
                left: 50%;
            }

            .close-list {
                background: none;
                border: none;
                color: #fff;
                display: flex;
                padding: 12px 18px;
                align-items: center;
                cursor: pointer;
                width: 100%;
            }

            .close {
                height: 34px;
                width: 34px;
                border: 1px solid #fff;
                border-radius: 50%;
                position: relative;
                transform: rotate(45deg);
            }

            .close span {
                background: #fff;
            }

            .close span:first-of-type {
                position: absolute;
                width: 1px;
                height: 18px;
                top: 8px;
                left: 16px;
            }

            .close span:last-of-type {
                position: absolute;
                width: 18px;
                height: 1px;
                top: 16px;
                left: 8px;
            }

            .list-item {
                background: #000;
                position: relative;
                border-left: 1px solid #fff;
                border-right: 1px solid #fff;
                list-style: none;
                transition: 0.2s ease-in;
            }

            .list-item::after {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 1px;
                border: #fff;
                z-index: 100;
                background: rgba(255, 255, 255, 1);
            }

            .list-item:first-of-type::after {
                display: none;
            }

            .list-item:hover {
                background: #212121;
            }

            .list-item:hover .author-wrap {
                background: #212121;
            }

            .author-wrap {
                display: flex;
                padding: 12px 18px;
                align-items: center;
                border-left: 0;
                border-right: 0;
                border-top: 0;
                border-bottom: 0;
                background: #000;
                color: #fff;
                display: flex;
                border: 0;
                align-items: center;
                z-index: 0;
                cursor: pointer;
                width: 100%;
                transition: 0.2s ease-in;
            }

            .text {
                font-weight: 500;
                font-family: 'Roboto';
                display: flex;
                flex-direction: column;
                text-align: left;
                margin-left: 15px;
            }

            .name {
                letter-spacing: 1px;
                font-size: 14px;
                font-weight: 500;
                font-family: 'Roboto Mono', monospace;
            }

            .title {
                font-family: 'Roboto Mono', monospace;
                margin-top: 2px;
                font-size: 12px;
                letter-spacing: 1px;
            }

            .author {
                display: inline-block;
                color: #bbffff;
                font-size: 12px;
                line-height: 12px;
                vertical-align: top;
                margin-left: 8px;
            }

            .body {
                display: inline-block;
                width: 70%;
                max-width: 980px;
                transition: visibility 0.11s, opacity 0.11s linear;
            }
            .comment {
                display: inline-block;
                font-size: 14px;
                color: #fff;
                margin-top: 5px;
                font-family: 'Roboto';
                pointer-events: auto;
                line-height: 1.55;
                letter-spacing: 1.5px;
            }

            button {
                pointer-events: auto;
                outline: none;
                -webkit-tap-highlight-color: rgba(0, 0, 0, 0);
            }
            .disabled {
                pointer-events: none;
            }
            .-small {
                min-height: 34px;
                min-width: 34px;
                height: 34px;
                width: 34px;
                object-fit: cover;
                border-radius: 50%;
                overflow: hidden;
            }

            .mobile-authors-list-title {
                display: none;
            }

            .share-close {
                display: none;
            }

            @media only screen and (max-width: 957px) {
                #container {
                    z-index: 53;
                    top: 60px;
                }

                .body {
                    width: 90%;
                }

                #container.scroll {
                    width: 100%;
                    height: 100%;
                    transform: none;
                    left: 0;
                    max-width: none;
                }

                #container.scroll .author-toggle {
                    display: none;
                }

                .author-toggle {
                    width: auto;
                    padding-right: 38px;
                }
                .author-toggle-arrow {
                    right: 12px;
                }

                #container.scroll .header {
                    background: #000;
                }

                .header-wrap {
                    width: 100%;
                    height: 100%;
                }

                .header {
                    position: inherit;
                    left: 0;
                    top: 0;
                    transform: none;
                    width: 100%;
                    height: 100%;
                }

                #container.scroll .header {
                    position: fixed;
                }

                .share-close.hide {
                    display: none;
                }

                .author-toggle-text {
                    font-size: 13px;
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
                    z-index: 10;
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

                .mobile-authors-list-title {
                    font-weight: 700;
                    font-family: 'Roboto Mono', monospace;
                    letter-spacing: 1px;
                    font-size: 14px;
                    display: block;
                    color: white;
                    text-align: left;
                    margin: 30px 0 10px 18px;
                    z-index: 1;
                }

                .authors-list {
                    max-height: none;
                    position: fixed;
                    background: #000;
                    width: 100%;
                    height: 100%;
                    border: none;
                    margin-top: 20px;
                    position: static;
                    margin: 5px auto 0;
                }

                .close {
                    height: 44px;
                    width: 44px;
                }

                .close span:first-of-type {
                    height: 20px;
                    left: 22px;
                    top: 13px;
                }

                .close span:last-of-type {
                    width: 20px;
                    left: 13px;
                    top: 22px;
                }

                .-small {
                    min-height: 34px;
                    height: 34px;
                    min-width: 34px;
                    width: 34px;
                }

                .list-item {
                    border: none;
                }

                .list-item:hover {
                    background: #000;
                }

                .list-item:hover .author-wrap {
                    background: #000;
                }

                .list-item:last-of-type {
                    padding-bottom: 50px;
                    margin-bottom: 50px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
                }
            }

            .disabled,
            .disabled * {
                pointer-events: none;
            }
        `
    }
}
customElements.define('comment-el', Comment)
