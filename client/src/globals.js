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

import { EventEmitter } from 'events'
import { css } from 'lit-element'
import { TileDefinitions } from './models/TileDefinitions'
import { tickConfig } from './components/Axis'
const queryParams = getUrlParams(document.location.search)
const ua = navigator.userAgent.toLowerCase()
const isTouch = 'ontouchstart' in document.documentElement

const anchorParams = parseUrlAnchor(document.location.hash)
const cache = !queryParams.nocache

window.onhashchange = function() {
    hashChanged(window.location.hash)
}

/**
 *
 * Helpful device variables
 *
 * */
export const Device = {
    isTouch,
    android: ua.indexOf('android') > -1,
    ios: /iPad|iPhone|iPod/.test(ua) && !window.MSStream,
    mobile: window.innerWidth < 768 && isTouch,
    tablet: window.innerWidth >= 768 && isTouch,
    tabletLandscape: window.innerWidth >= 768 && window.innerHeight <= 768 && isTouch,
    desktop: window.innerWidth >= 992 && !isTouch,
    laptop: window.innerHeight <= 800 && !isTouch,
}

/** Store defaults here */
export const Config = {
    defaultLocation: queryParams.location || 'Hawaii',
    // defaultLocation: 'HAWAII10',
    // defaultPosition: 0,
    defaultPosition: anchorParams.position || parseFloat(queryParams.position) || 1423645400000,
    defaultDuration: anchorParams.duration || parseFloat(queryParams.duration) || 236034,
    initialZoom: 0.35,
    annotationUrl: queryParams.liveAnnotations
        ? 'https://us-central1-gweb-deepblue.cloudfunctions.net/annotations'
        : '/assets/annotations.tsv',
    minDuration: 14000,
    maxDuration: 1000000000,
    isCluster: true,
    debug: queryParams.debug || false,
    tileWidth: 512,
    controlsHeight: 120,
    similarityBreakpoint: 80000,
    tileHeight: window.innerHeight > 800 && !Device.mobile ? 2048 : 1024,
    tileScaleMin: 1 / 8,
    tileScaleMax: 1 / 4,
    spectrogramOffset: 25,
    scalePadding: 5,
    fullscreenAspect: 3 / 1,
    apiPath: cache ? '/api/' : 'https://us-central1-gweb-deepblue.cloudfunctions.net/',
    time: parseFloat(queryParams.time) || null,
    skipIntro: !!(queryParams.position || queryParams.duration || anchorParams.position || queryParams.skipIntro),
    annotate: queryParams.liveAnnotations,
    transitionTime: css`0.3s`,
    bgColor: 0,
    skipPeriods: [[1403884109820.9546, 1406553366476.4119]],
    minStartTime: 1395705601000,
    datgui: false,
    authors: {
        ann: {
            id: 'ann',
            name: 'Ann Allen',
            image: '/assets/ann.jpg',
            alt: 'Ann Allen',
            title: 'Research Oceanographer',
            blurb:
                'Hear firsthand from the research oceanographer who deploys HARPs and other types of underwater microphones as part of her work at NOAA Fisheries.',
        },
        matt: {
            id: 'matt',
            name: 'Matt Harvey',
            image: '/assets/matt.jpg',
            alt: 'Matt Harvey',
            title: 'Software Engineer',
            blurb:
                'Get a look at the sounds from the viewpoint of Matt Harvey, whose collaboration with Ann Allen on a machine learning model to recognize humpback whale sounds is part of what makes this website possible.',
        },
        students: {
            id: 'students',
            name: 'Class Workshop',
            image: '/assets/class.jpg',
            alt: 'Class Workshop',
            title: '7th Grade Class',
            blurb:
                'Explore some of the questions, curiosities, and observations sparked during a one-day workshop with seventh grade students.',
        },
        chris: {
            id: 'chris',
            name: 'Chris Clark',
            image: '/assets/chris.jpg',
            alt: 'Chris posing for camera',
            title: 'Acoustic Biologist',
            blurb:
                'In this tour, bioacoustic pioneer Chris Clark takes a look at an acoustic scene and prods you to think about what you see at different perspective levels — from one week to two minutes at a time.',
        },
        annie: {
            id: 'annie',
            name: 'Annie Lewandowski',
            image: '/assets/annie.jpg',
            alt: 'Annie wearing orange glasses',
            title: 'Composer and Whale Song Researcher',
            blurb:
                'Explore the evolving musical structure of a humpback whale song through the eyes of musical composer/performer Annie Lewandowski.',
        },
        david: {
            id: 'david',
            name: 'David Rothenberg',
            image: '/assets/david.jpg',
            alt: 'David Rothenberg',
            title: 'Musician and Philosopher',
            blurb:
                'See a humpback whale song through the eyes of composer and jazz clarinetist David Rothenberg, whose work explores the relationship between humanity and nature through music.',
        },
        yotam: {
            id: 'yotam',
            name: 'Yotam Mann',
            image: '/assets/yotam.jpg',
            alt: 'Yotam Mann',
            title: 'Creative Technologist',
            blurb:
                'Find some neat and unusual aspects of these recordings pointed out by Yotam Mann, who helped build the site. Note the effects of passing ships, mysterious mechanical sounds, and more.',
        },
    },
}

export function updateGlobals() {
    Device.mobile = window.innerWidth < 768 && isTouch
    Device.tablet = window.innerWidth >= 768 && isTouch
    Device.tabletLandscape = window.innerWidth >= 768 && window.innerHeight <= 768 && isTouch
    Device.desktop = window.innerWidth >= 992 && !isTouch
    Device.laptop = window.innerHeight <= 800 && !isTouch

    Globals.fullscreen = window.innerWidth / window.innerHeight > Config.fullscreenAspect || window.innerHeight < 500
    tickConfig.ticks[0].yOffset = Globals.fullscreen ? 22 : 32
    tickConfig.ticks[0].textStyle.fontSize = Globals.fullscreen ? 13 : 15
    tickConfig.stickyXOffset = Globals.fullscreen ? 6 : 8

    Config.spectrogramOffset = Device.tabletLandscape || Device.mobile ? 0 : 25
    Config.tileScaleMin = 1 / 8
    Config.tileScaleMax = 1 / 4
    if (window.innerHeight > 800 && !Device.mobile) {
        Config.tileScaleMax = window.innerHeight < 950 ? 1 / 5 : 1 / 4
        Config.tileHeight = 2048
    } else {
        Config.tileHeight = 1024
    }
    if (Device.mobile || (Device.tablet && !Device.tabletLandscape)) {
        Config.tileScaleMin = 1 / 9
        Config.tileScaleMax = 1 / 5
    }
    if (Device.tabletLandscape) {
        Config.tileScaleMax = 1 / 3.25
        Config.tileScaleMin = 1 / 6
    }
    if (window.innerHeight >= 736 && Device.mobile) {
        Config.tileScaleMax = window.innerHeight > 800 ? 1 / 3.25 : 1 / 3.75
        Config.tileScaleMin = 1 / 6
    }
    if (window.innerHeight <= 667) {
        Config.tileScaleMax = 1 / 6
        Config.tileScaleMin = 1 / 10
    }
}

/**
 * Global state the app uses to
 * keep track of various times
 *
 * */
export const Times = {
    scaleStartTimeMs: 0,
    currentTimeMs: 0,
    scaleEndTimeMs: 0,
    scaleStartTimeDate: new Date(),
    currentTimeDate: new Date(),
    scaleEndTimeDate: new Date(),
}

export const Globals = {
    player: null,
    spectrogram: null,
    controls: null,
    events: new EventEmitter(),
    currentLocation: null,
    isScrubbing: false,
    timeManager: null,
    fullscreen: window.innerWidth / window.innerHeight > Config.fullscreenAspect || window.innerHeight < 500,
}

function getUrlParams(search) {
    const hashes = search.slice(search.indexOf('?') + 1).split('&')
    return hashes.reduce((params, hash) => {
        const [key, val] = hash.split('=')
        return Object.assign(params, { [key]: decodeURIComponent(val) })
    }, {})
}

function hashChanged(hash) {
    const timeTransition = 750
    const parsedHash = parseUrlAnchor(hash)
    if (parsedHash) {
        Globals.controls.tweens.position
            .stop()
            .to(
                {
                    position: parsedHash.position - Globals.currentLocation.startTime,
                },
                timeTransition
            )
            .start()
    }
}
function parseUrlAnchor(hash) {
    const epochMatch = hash.match(/^#(\d{10})(?:z(-?\d+))?/i)
    const isoMatch = Date.parse(hash.replace('#', ''))
    let ret = {}
    try {
        if (epochMatch) {
            ret.position = parseInt(epochMatch[1]) * 1000

            if (epochMatch[2]) {
                ret.duration = TileDefinitions.zoomLevelDuration(parseInt(epochMatch[2]))
            }
        } else if (isoMatch) {
            ret.position = isoMatch
        }
    } catch (e) {
        console.error(e)
    }
    return ret
}

if (anchorParams.position) {
    gtag('event', 'load_anchor_time', { value: anchorParams.position })
}
