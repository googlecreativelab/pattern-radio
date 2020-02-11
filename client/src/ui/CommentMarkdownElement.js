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
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js'
import { Parser, HtmlRenderer } from 'commonmark'
import { Globals } from '../globals'

class CommentMarkdownElement extends LitElement {
    render() {
        return html`
            <div class="container ${this.expanded ? 'expanded' : ''} ${this.truncatedState}">
                ${unsafeHTML(this.renderedMarkdown)}
                ${!this.expanded && this.truncatedState === 'truncated'
                    ? html`
                          <a
                              class="read-more"
                              @click=${() => {
                                  this.expanded = true
                              }}
                              >read more</a
                          >
                      `
                    : ''}
                ${this.expanded
                    ? html`
                          <a
                              class="read-more"
                              @click=${() => {
                                  this.expanded = false
                              }}
                              >collapse</a
                          >
                      `
                    : ''}
            </div>
        `
    }

    updated() {
        const anchors = this.shadowRoot.querySelectorAll('a')
        for (let a of anchors) {
            const dateMatch = a.href.match(/#(\d{4}-\d{2}-\d{2}T.+)$/i)
            if (!dateMatch) {
                const anchorMatch = a.href.match(/#(.+$)/i)
                if (anchorMatch) {
                    a.href = 'javascript: void(0)'
                    const key = anchorMatch[1]
                    a.onclick = () => {
                        Globals.spectrogram.annotationLayer.navigateToCommentAnchor(key)
                    }
                } else {
                    a.target = '_blank'
                }
            }
        }
    }

    constructor() {
        super()
    }

    static get properties() {
        return {
            markdown: String,
            renderedMarkdown: String,
            truncatedMarkdown: String,
            expanded: Boolean,
            truncatedState: String,
        }
    }

    // // render the markdown using the `markdown` attribute
    // // `markdown` is set either by the user or the component
    set markdown(markdown) {
        this.truncatedState = 'reset'
        clearTimeout(this.markdownTimeout)
        this.markdownTimeout = setTimeout(() => {
            const p = this.shadowRoot.querySelector('p')
            if (p && p.offsetHeight > 63) {
                this.truncatedState = 'truncated'
            } else {
                this.truncatedState = 'not-truncated'
            }
        }, 10)
        this.renderMarkdown(markdown).then((r) => (this.renderedMarkdown = r))
    }

    async renderMarkdown(markdown) {
        // parse and render Markdown
        const reader = new Parser()
        const writer = new HtmlRenderer()
        this.expanded = false
        return writer.render(reader.parse(markdown))
    }
    static get styles() {
        return css`
            .container {
                visibility: hidden;
                max-height: 4.5em;
                overflow: hidden;
                position: relative;
            }

            .container.not-truncated,
            .container.truncated {
                max-height: none;
                overflow: visible;
                visibility: visible;
            }

            a {
                color: #bbffff;
            }

            p {
                margin: 0;
                position: relative;
            }

            .not-truncated p {
                visibility: visible;
                position: relative;
            }

            .truncated > p {
                overflow: hidden;
                height: 3em;
                visibility: visible;
                line-height: 1.5em;
                position: relative;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                word-wrap: break-word;
                -webkit-box-orient: vertical;
            }

            .expanded > p {
                height: auto;
                overflow: visible;
                -webkit-line-clamp: initial;
            }
            .expanded > a {
                padding-bottom: 15px;
                display: block;
            }

            .read-more {
                position: relative;
                text-decoration: underline;
                cursor: pointer;
            }
        `
    }
}

customElements.define('comment-markdown-element', CommentMarkdownElement)
