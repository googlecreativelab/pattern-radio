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

import { Config } from '../globals'

let annotationsCache = undefined

export async function getAnnotations() {
    if (annotationsCache) return annotationsCache
    // const response = await fetch(Config.apiPath + 'annotations')
    const response = await fetch(Config.annotationUrl)
    if (response.ok) {
        const annotations = await response.text()
        annotationsCache = parseAnnotationTSV(annotations)
        return annotationsCache
    }
}

function parseAnnotationTSV(tsv) {
    const lines = tsv.split('\r\n')
    const headers = lines.slice(0, 1)[0].split('\t')

    const colIndex = {
        location: headers.indexOf('location'),
        timeStart: headers.indexOf('time_start'),
        timeEnd: headers.indexOf('time_end'),
        comment: headers.indexOf('comment'),
        author: headers.indexOf('author'),
        optional_anchor: headers.indexOf('optional_anchor'),
    }

    for (let key in colIndex) {
        if (colIndex[key] == -1) {
            console.error('Could not parse annotations. Column ' + key + ' not found')
            return []
        }
    }

    const annotations = {}
    lines.slice(1, lines.length).forEach((line, lineIndex) => {
        const data = line.split('\t')
        for (let i = 0; i < data.length; i++) {
            data[i] = data[i].trim()
        }
        data[colIndex.location] = data[colIndex.location].trim()
        const lineObj = {
            timeStart: new Date(data[colIndex.timeStart]).getTime(),
            timeEnd: new Date(data[colIndex.timeEnd]).getTime(),
            comment: data[colIndex.comment],
            author: data[colIndex.author],
            anchor: data[colIndex.optional_anchor],
        }

        if (!lineObj.timeStart || !lineObj.timeEnd || !lineObj.comment || !lineObj.author) {
            console.warn('Could not parse annotation line ' + (lineIndex + 2), data)
            return
        }

        lineObj.duration = lineObj.timeEnd - lineObj.timeStart

        if (annotations.hasOwnProperty(data[colIndex.location])) {
            annotations[data[colIndex.location]].push(lineObj)
        } else {
            annotations[data[colIndex.location]] = [lineObj]
        }
    })
    // Object.keys(annotations).forEach((location) => {
    //     annotations[location].sort((a, b) => {
    //         return a.timeStart - b.timeStart
    //     })
    // })

    return annotations
}
