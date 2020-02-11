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

import { Sprite, Container, Texture, Graphics, Circle, BLEND_MODES } from 'pixi.js'
import { GlowFilter } from '@pixi/filter-glow'
import * as TWEEN from '@tweenjs/tween.js'
import { Globals, Config } from '../globals'
import { hexToRGB, rgbToNum } from '../util/Math'
import { getAnnotations } from '../network/Annotations'

const strokeWeight = 8
const commentPadding = 3
const commentLayerHeight = strokeWeight + commentPadding * 2
const blue = 0xbbffff
const gray = 0x333333
let roundedEdgeLeft
const shortTimeTransition = 110
const highlightAlpha = 0.3

export class AnnotationLayer extends Container {
    constructor(spectrogram, commentEl, infoBubble) {
        super()
        this.spectrogram = spectrogram
        this.comment = commentEl
        this.infoBubble = infoBubble
        this.annotationsData = null
        this.commentsContainer = new Container()
        this.commentsContainer.y = -commentPadding * 3
        this.addChild(this.commentsContainer)
        this.commentGroupsContainer = new Container()
        this.addChild(this.commentGroupsContainer)
        this.selectedSpriteIndex = null
        this.highlightedIndex = null
        this.hoveredComment = null
        this.disabled = true
        this.commentNavSkip = 0
        const highlight = new Sprite(Texture.WHITE)
        highlight.tint = 0xbbffff
        highlight.blendMode = BLEND_MODES.ADD
        highlight.alpha = highlightAlpha
        highlight.visible = false
        highlight.alpha = 0
        this.highlight = highlight
        this.addChild(this.highlight)
        const leftEdgeGraphic = new Graphics()
        leftEdgeGraphic
            .beginFill(0xffffff)
            .arc(0, 0, strokeWeight, Math.PI / 2, -Math.PI / 2)
            .endFill()
        roundedEdgeLeft = Globals.pixiApp.renderer.generateTexture(leftEdgeGraphic)
        this.commentGroups = []
        this.settling = false
        this.positioning = null
        this.firstCommentSelectable = true
        this.lastCommentSelectable = true
        this.comment.addEventListener('authorChange', (e) => {
            Globals.controls.tweens.position.stop()
            Globals.controls.tweens.duration.stop()
            this.positioning = null
            this.commentNavSkip = 0
            if (e.detail !== null) {
                this.disabled = false
                this._filterComments(e.detail.name)
            } else {
                this.disabled = true
                this.commentsContainer.children.forEach((otherSprite) => {
                    otherSprite.tint = gray
                })
                this._hideHighlight()
                this.selectedSpriteIndex = null
                setTimeout(() => {
                    this._filterComments()
                }, shortTimeTransition)
            }
        })
        this.comment.addEventListener('nextComment', () => {
            this.nextComment()
        })
        this.comment.addEventListener('prevComment', () => {
            this.previousComment()
        })
        Globals.controls.$$canvas.addEventListener('mousemove', (e) => {
            if (this.hoveredComment) {
                this.infoBubble.coords = {
                    x: e.clientX - this.infoBubble.$$container.offsetWidth / 2,
                    y: this.hoveredComment.worldTransform.ty - this.infoBubble.containerHeight - commentLayerHeight / 2,
                }
            }
        })
        Globals.events.on('zoom', this.updateGroups.bind(this))
        this.highlightTween = new TWEEN.Tween(this.highlight)
    }

    set location(location) {
        this._location = location
        this._filterComments()
    }

    get location() {
        return this._location
    }

    _filterComments(filter = false) {
        let selectedIndex = null
        let annotations = this.annotationsData[this.location.name].slice().sort((a, b) => {
            return a.timeStart - b.timeStart
        })
        // filtering by author name
        if (filter) {
            annotations = annotations.filter((annotation) => annotation.author === filter)
            if (!annotations.length) {
                console.error('No annotations for ', filter)
                return
            }
            // start at the first comment by default for a selected author
            selectedIndex = 0
        }
        if (this.hoveredComment) {
            this.hoveredComment = null
            this.infoBubble.author = null
        }
        AnnotationLayer.emptyContainer(this.commentsContainer)
        // populate annotations based on the data for this location
        this.yLevels = [0]
        const commentGroups = []

        this.filteredAnnotations = annotations
        annotations.forEach((annotation, i) => {
            const sprite = new CommentSprite(this, annotation, i)
            // determine what y-position level to put this comment on (above the spectrogram)
            for (let level = 0; level < this.yLevels.length; level++) {
                if (this.yLevels[level] <= sprite.data.timeStart - 1000) {
                    sprite.yLevel = level
                    this.yLevels[level] = sprite.data.timeEnd
                    break
                }
            }
            if (sprite.yLevel === null) {
                sprite.yLevel = this.yLevels.length
                this.yLevels.push(sprite.data.timeEnd)
            }
            this.commentsContainer.addChild(sprite)
            // add to comment overlap groups
            if (i) {
                const group = commentGroups[commentGroups.length - 1]
                if (sprite.data.timeStart <= group.end) {
                    group.addComment(sprite)
                } else {
                    commentGroups.push(new CommentGroup(this, sprite))
                }
            } else {
                commentGroups.push(new CommentGroup(this, sprite))
            }
        })
        this.commentGroups = []
        AnnotationLayer.emptyContainer(this.commentGroupsContainer)
        commentGroups.forEach((group) => {
            if (group.comments.length > 1) {
                group.initialize(this.commentGroupsContainer, this.commentGroups)
            }
        })
        this.updateGroups()
        this.commentsContainer.children.forEach((sprite) => {
            sprite.y = (this.yLevels.length - sprite.yLevel) * commentLayerHeight - strokeWeight
        })
        const yPos = this.yLevels.length * commentLayerHeight
        this.highlight.y = yPos
        this.commentGroupsContainer.y = yPos - commentPadding * 2
        // handle selection
        if (selectedIndex !== null) {
            this._navigateToComment(selectedIndex)
        }
    }

    async load() {
        this.annotationsData = await getAnnotations()
    }

    update() {
        this._updateYPosition()
        this._updateSpritePositions()
    }

    _updateYPosition() {
        this.y = (window.innerHeight - this.spectrogram.height) / 2 - this.yLevels.length * commentLayerHeight
    }

    _updateSpritePositions() {
        const windowDuration = Globals.timeManager.windowDuration
        const time = Globals.timeManager.currentTime
        if (!windowDuration || !this.commentsContainer.children.length) return
        const windowStart = Globals.timeManager.windowStartTime
        const windowEnd = Globals.timeManager.windowEndTime
        let commentSelected = false
        // update individual sprites
        this.commentsContainer.children.forEach((sprite, spriteIndex) => {
            // if sprite is onscreen, and not consolidated into a group, set position
            // and check if it should be showing in the pinned element
            if (
                (!sprite.group || !sprite.group.consolidated) &&
                sprite.data.timeStart < windowEnd &&
                sprite.data.timeEnd > windowStart
            ) {
                sprite.visible = true
                // position and size
                sprite.update()
                // check if comment involves the current time
                // and set the currently selected sprite
                if (sprite.data.timeStart <= time && sprite.data.timeEnd >= time) {
                    if (!sprite.selectable) {
                        if (!this.settling && this.positioning === null) {
                            this._selectComment(sprite, spriteIndex)
                        }
                        sprite.selectable = true
                    }
                } else {
                    if (sprite.selectable) {
                        sprite.selectable = false
                        if (this.selectedSpriteIndex === spriteIndex && this.positioning === null) {
                            // find last (latest) comment that is selectable
                            for (let i = this.commentsContainer.children.length - 1; i >= 0; i--) {
                                const selectedSprite = this.commentsContainer.getChildAt(i)
                                if (selectedSprite.selectable) {
                                    this._selectComment(selectedSprite, i)
                                    break
                                }
                            }
                        }
                    }
                }
                if (sprite.selectable && !commentSelected) {
                    commentSelected = true
                }
            } else {
                sprite.visible = false
                sprite.selectable = false
            }
        })
        // update sprite overlap groups
        this.commentGroups.forEach((group) => {
            if (
                group.consolidated &&
                group.median < windowEnd + strokeWeight / 2 &&
                group.median > windowStart - strokeWeight / 2
            ) {
                group.graphic.visible = true
                group.updatePosition()
                // check if group involves the current time
                // and set the currently selected sprite
                // const firstComment = group.comments[0]
                // if (group.start <= time && group.end >   = time) {
                //     if (!group.selected && this.positioning === null) {
                //         this._selectComment(firstComment, firstComment.index)
                //         group.selected = true
                //     }
                // } else {
                //     group.selected = false
                // }
                // if (group.selected && !commentSelected) {
                //     commentSelected = true
                // }
            } else {
                group.selected = false
                group.graphic.visible = false
            }
        })
        // close the comment if it is open but no annotation is selected
        if (!commentSelected && this.comment.annotation !== null) {
            this.comment.annotation = null
            this._hideHighlight()
            if (!this.disabled && this.positioning === null) {
                this.commentsContainer.children.forEach((otherSprite) => {
                    otherSprite.tint = blue
                })
                this.commentGroups.forEach((group) => {
                    group.tint = blue
                })
            }
            this.selectedSpriteIndex = null
        }
        // position highlight
        if (this.highlightedIndex !== null && this.positioning === null) {
            const selectedSprite = this.commentsContainer.getChildAt(this.highlightedIndex)
            this.highlight.x = selectedSprite.x + commentPadding
            this.highlight.width = selectedSprite.middle.width + strokeWeight
            this.highlight.height = this.spectrogram.height
        }
        // handle comment selectability for the < and > icons in the Comment element
        this.firstCommentSelectable =
            Globals.timeManager.currentTime > this.commentsContainer.getChildAt(0).data.timeStart &&
            ((this.selectedSpriteIndex === 0 && this.positioning !== null) || this.selectedSpriteIndex !== 0)
        const lastCommentIndex = this.commentsContainer.children.length - 1
        this.lastCommentSelectable =
            Globals.timeManager.currentTime < this.commentsContainer.getChildAt(lastCommentIndex).data.timeEnd &&
            ((this.selectedSpriteIndex === lastCommentIndex && this.positioning !== null) ||
                this.selectedSpriteIndex !== lastCommentIndex)
        if (this.comment.firstCommentSelectable !== this.firstCommentSelectable) {
            this.comment.firstCommentSelectable = this.firstCommentSelectable
        }
        if (this.comment.lastCommentSelectable !== this.lastCommentSelectable) {
            this.comment.lastCommentSelectable = this.lastCommentSelectable
        }
        this.settling = false
    }

    _selectComment(sprite, index) {
        if (this.disabled) return
        this.comment.annotation = sprite.data
        this.selectedSpriteIndex = index
        if (!sprite.group || !sprite.group.consolidated) {
            this._showHighlight()
        } else {
            this._hideHighlight()
        }
        sprite.tint = blue
        if (sprite.group) {
            sprite.group.tint = blue
        }
        this.commentsContainer.children.forEach((otherSprite, i) => {
            if (i !== index) {
                otherSprite.tint = gray
            }
        })
        this.commentGroups.forEach((group) => {
            if (group !== sprite.group) {
                group.tint = gray
            }
        })
        this.settling = true
    }

    navigateToCommentAnchor(anchor) {
        const annotation = this.filteredAnnotations.findIndex((x) => x.anchor == anchor)
        if (annotation !== -1) {
            this._navigateToComment(annotation)
        } else {
            console.error('Anchor ' + anchor + ' not found')
        }
    }

    _navigateToComment(index) {
        if (this.disabled) return
        this.selectedSpriteIndex = index
        const sprite = this.commentsContainer.getChildAt(index)

        this._hideHighlight()
        this.positioning = sprite

        Globals.controls.navigateTo(sprite.data.timeStart, AnnotationLayer.getIdealWindowDuration(sprite), () => {
            if (this.positioning !== null) {
                this._selectComment(this.positioning, this.positioning.index)
            }
            this.positioning = null
            this.commentNavSkip = 0

            this.updateGroups()
        })
    }

    nextComment() {
        if (this.positioning !== null) {
            this.commentNavSkip++
        }
        let nextIndex = this.commentsContainer.children.findIndex((sprite) => {
            return sprite.data.timeStart > Globals.timeManager.currentTime
        })
        if (nextIndex !== -1) {
            nextIndex += this.commentNavSkip
            if (nextIndex >= 0 && nextIndex < this.commentsContainer.children.length) {
                this._navigateToComment(nextIndex)
            }
        }
    }

    previousComment() {
        if (this.positioning !== null) {
            this.commentNavSkip--
        }
        let prevIndex =
            this.commentsContainer.children.length -
            1 -
            this.commentsContainer.children
                .slice()
                .reverse()
                .findIndex((sprite) => {
                    return sprite.data.timeStart < Globals.timeManager.currentTime
                })
        if (prevIndex !== -1) {
            prevIndex += this.commentNavSkip
            if (prevIndex && prevIndex === this.selectedSpriteIndex) {
                prevIndex--
            }
            if (prevIndex >= 0 && prevIndex < this.commentsContainer.children.length) {
                this._navigateToComment(prevIndex)
            }
        }
    }

    updateGroups() {
        if (!this.spectrogram.windowDuration || !this.annotationsData || !this.commentGroups.length) return
        const minGroupWidth = strokeWeight * 3
        this.commentGroups.forEach((group) => {
            const pixelDuration = Globals.timeManager.durationToPx(group.start, group.end)
            if (!group.consolidated && pixelDuration < minGroupWidth) {
                group.consolidated = true
            } else if (group.consolidated && pixelDuration >= minGroupWidth) {
                group.consolidated = false
            }
        })
    }

    static emptyContainer(container) {
        container.children.forEach((child) => {
            child.filters = null
            Object.values(child.tweener.tweens).forEach((tween) => {
                tween.stop()
                TWEEN.remove(tween)
            })
            child.destroy({ children: true })
        })
        container.removeChildren()
    }

    spritePointerDown(sprite) {
        if (this.disabled) {
            setTimeout(() => {
                Globals.controls.scrub.dragStop()
            }, 100)
            this.comment.startTour(AnnotationLayer.getAuthorID(sprite.data.author))
        } else {
            this._navigateToComment(sprite.index)
        }
    }

    spriteMouseOver(e, obj, sprite = false, filterObj = false) {
        sprite = sprite || obj
        filterObj = filterObj || obj
        if (this.disabled) {
            this.commentsContainer.children.forEach((otherSprite) => {
                otherSprite.tint = otherSprite.data.author === sprite.data.author ? blue : gray
            })
        }

        obj.glowFilter.color = obj.tint
        filterObj.filters = [obj.glowFilter]
        obj.tweens.glow
            .stop()
            .to({ outerStrength: filterConfig.outerStrength }, shortTimeTransition)
            .onComplete(() => {})
            .start()
        this.hoveredComment = filterObj
        this.infoBubble.author = AnnotationLayer.getAuthorID(sprite.data.author)
        this.infoBubble.coords = {
            x: e.data.global.x - this.infoBubble.$$container.offsetWidth / 2,
            y: sprite.worldTransform.ty - this.infoBubble.containerHeight - commentLayerHeight / 2,
        }
    }

    spriteMouseOut(obj, filterObj = false) {
        filterObj = filterObj || obj

        obj.tweens.glow
            .stop()
            .to({ outerStrength: 0 }, shortTimeTransition)
            .onComplete(() => {
                filterObj.filters = null
            })
            .start()
        if (this.hoveredComment === filterObj) {
            if (this.disabled) {
                this.commentsContainer.children.forEach((otherSprite) => {
                    otherSprite.tint = gray
                })
            }
            this.hoveredComment = null
            this.infoBubble.author = null
        }
    }

    _showHighlight() {
        this.highlightedIndex = this.selectedSpriteIndex
        this.highlightTween
            .stop()
            .to({ alpha: highlightAlpha }, shortTimeTransition)
            .onStart(() => {
                this.highlight.visible = true
            })
            .onComplete(() => {})
            .start()
    }

    _hideHighlight() {
        this.highlightTween
            .stop()
            .to({ alpha: 0 }, shortTimeTransition)
            .onStart(() => {})
            .onComplete(() => {
                this.highlightedIndex = null
                this.highlight.visible = false
            })
            .start()
    }

    static getAuthorID(name) {
        return Object.values(Config.authors).find((authorObj) => {
            return authorObj.name === name
        }).id
    }

    static getIdealWindowDuration(sprite) {
        const windowPctOfComment = 2.5
        return (sprite.data.duration * windowPctOfComment * Config.tileWidth) / window.innerWidth
    }
}

const filterConfig = {
    distance: 8,
    outerStrength: 1.5,
    quality: 0.75,
}

class CommentSprite extends Container {
    constructor(annotationLayer, annotation, index) {
        super()
        this.annotationLayer = annotationLayer
        this.data = annotation
        this.index = index
        const middle = new Sprite(Texture.WHITE)
        middle.height = strokeWeight
        middle.x = strokeWeight / 2 + commentPadding
        middle.y = commentPadding
        this.middle = middle
        this.addChild(this.middle)
        const bg = new Sprite(Texture.EMPTY)
        bg.renderable = false
        bg.height = commentLayerHeight
        this.bg = bg
        this.addChild(this.bg)
        this.selectable = false
        this.yLevel = null
        this.group = null
        this.visible = false
        this.interactive = true
        this.cursor = 'pointer'
        this.on('pointerdown', () => {
            this.annotationLayer.spritePointerDown(this)
        })
        this.on('mouseover', (e) => {
            this.annotationLayer.spriteMouseOver(e, this)
        })
        this.on('mouseout', () => {
            this.annotationLayer.spriteMouseOut(this)
        })
        const leftEdge = new Sprite(roundedEdgeLeft)
        leftEdge.width = strokeWeight / 2
        leftEdge.height = strokeWeight
        leftEdge.x = leftEdge.y = commentPadding
        this.leftEdge = leftEdge
        const rightEdge = new Sprite(roundedEdgeLeft)
        rightEdge.scale.x = -1
        rightEdge.y = commentPadding
        rightEdge.width = strokeWeight / 2
        rightEdge.height = strokeWeight
        this.rightEdge = rightEdge
        this.addChild(this.leftEdge)
        this.addChild(this.rightEdge)
        this.glowFilter = new GlowFilter(filterConfig.distance, 0, 0, gray, filterConfig.quality)
        const rgb = hexToRGB(gray)
        this.colorTweenHelper = {
            r: rgb[0],
            g: rgb[1],
            b: rgb[2],
        }
        this.tweener = this
        this.tweens = {
            color: new TWEEN.Tween(this.colorTweenHelper),
            glow: new TWEEN.Tween(this.glowFilter),
        }
        this._tint = gray
        this._syncTints(this.tint)
    }

    get tint() {
        return this._tint
    }

    set tint(tint) {
        if (this.tint !== tint) {
            if (this.group && this.group.tint !== tint) {
                this.group.tint = tint
            }
            const nextRgb = hexToRGB(tint)
            this.tweens.color
                .stop()
                .to(
                    {
                        r: nextRgb[0],
                        g: nextRgb[1],
                        b: nextRgb[2],
                    },
                    shortTimeTransition
                )
                .onUpdate((color) => {
                    this._syncTints(rgbToNum(color.r, color.g, color.b))
                })
                .start()
            this._tint = tint
        }
    }

    _syncTints(tint) {
        this.glowFilter.color = this.middle.tint = this.leftEdge.tint = this.rightEdge.tint = tint
    }

    update() {
        this.x = Globals.timeManager.timeToPx(this.data.timeStart) - strokeWeight / 2
        let width = Globals.timeManager.durationToPx(this.data.timeStart, this.data.timeEnd)
        if (width < strokeWeight + 1) {
            width = strokeWeight
        }
        const fullWidth = width + commentPadding * 2
        this.bg.width = fullWidth
        this.middle.width = width - strokeWeight
        this.rightEdge.x = width + commentPadding
    }
}

class CommentGroup {
    constructor(annotationLayer, sprite) {
        this.annotationLayer = annotationLayer
        this.comments = []
        this.start = null
        this.end = null
        this.selected = false
        this.addComment(sprite)
        this._consolidated = false
    }

    initialize(container, commentGroups) {
        this.duration = this.end - this.start
        this.median = this.start + this.duration / 2
        const graphic = new Graphics()
        graphic
            .beginFill(0xffffff)
            .drawCircle(0, 0, strokeWeight / 2)
            .endFill()
        graphic.hitArea = new Circle(0, 0, commentLayerHeight / 2)
        graphic.visible = false
        graphic.pivot.y = strokeWeight / 2
        graphic.tweener = this
        graphic.interactive = true
        graphic.cursor = 'pointer'
        graphic.on('pointerdown', () => {
            this.annotationLayer.spritePointerDown(this.comments[0])
        })
        graphic.on('mouseover', (e) => {
            this.annotationLayer.spriteMouseOver(e, this, this.comments[0], this.graphic)
        })
        graphic.on('mouseout', () => {
            this.annotationLayer.spriteMouseOut(this, this.graphic)
        })
        this.graphic = graphic
        container.addChild(this.graphic)
        commentGroups.push(this)
        this.glowFilter = new GlowFilter(filterConfig.distance, 0, 0, gray, filterConfig.quality)
        const rgb = hexToRGB(gray)
        this.colorTweenHelper = {
            r: rgb[0],
            g: rgb[1],
            b: rgb[2],
        }
        this.tweens = {
            color: new TWEEN.Tween(this.colorTweenHelper),
            glow: new TWEEN.Tween(this.glowFilter),
        }
        this._tint = gray
        this._syncTints(this.tint)
    }

    addComment(sprite) {
        this.comments.push(sprite)
        sprite.group = this
        if (sprite.data.timeEnd > this.end || this.end === null) {
            this.end = sprite.data.timeEnd
        }
        if (sprite.data.timeStart < this.start || this.start === null) {
            this.start = sprite.data.timeStart
        }
    }

    updatePosition() {
        this.graphic.x = Globals.timeManager.timeToPx(this.median)
    }

    get tint() {
        return this._tint
    }

    set tint(tint) {
        if (this.tint !== tint && this.graphic) {
            const nextRgb = hexToRGB(tint)
            this.tweens.color
                .stop()
                .to(
                    {
                        r: nextRgb[0],
                        g: nextRgb[1],
                        b: nextRgb[2],
                    },
                    shortTimeTransition
                )
                .onUpdate((color) => {
                    this._syncTints(rgbToNum(color.r, color.g, color.b))
                })
                .start()
            this._tint = tint
        }
        this._tint = tint
    }

    _syncTints(tint) {
        if (this.graphic) {
            this.graphic.tint = this.glowFilter.color = tint
        }
    }

    set consolidated(consolidated) {
        this._consolidated = consolidated
        if (consolidated) {
            const commentHoverIndex = this.comments.findIndex((comment) => {
                return this.annotationLayer.hoveredComment === comment
            })
            if (commentHoverIndex !== -1) {
                this.annotationLayer.spriteMouseOut(this.comments[commentHoverIndex])
            }
        } else {
            if (this.annotationLayer.hoveredComment === this.graphic) {
                this.annotationLayer.spriteMouseOut(this, this.graphic)
            }
        }
    }

    get consolidated() {
        return this._consolidated
    }
}
