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

export function scaleToRange(num, inMin, inMax, outMin, outMax) {
    return ((num - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin
}

export function logScale(position, resultMin, resultMax, minp = 0, maxp = 100) {
    // The result should be between 100 an 10000000
    const minv = Math.log(resultMin)
    const maxv = Math.log(resultMax)

    // calculate adjustment factor
    const scale = (maxv - minv) / (maxp - minp)

    return Math.exp(minv + scale * (position - minp))
}

// resolve linearScale from a known duration
export function getLogPosition(
    duration,
    resultMin,
    resultMax,
    minp = 0,
    maxp = 100
) {
    const minv = Math.log(resultMin)
    const maxv = Math.log(resultMax)

    // calculate adjustment factor
    const scale = (maxv - minv) / (maxp - minp)

    return (Math.log(duration) - minv) / scale + minp
}
export function distance(x1, y1, x2, y2) {
    const a = x1 - x2
    const b = y1 - y2
    return Math.sqrt(a*a + b*b)
}

export function clamp(val, min, max) {
    if (val > max) return max
    if (val < min) return min
    return val
}

export function interpolateColor(hex1, hex2, factor) {
    const color1 = hexToRGB(hex1)
    const color2 = hexToRGB(hex2)
    const result = color1.slice()
    for (let i = 0; i < 3; i++) {
        result[i] = Math.round(result[i] + factor * (color2[i] - color1[i]))
    }
    return result
}

export function interpolateMultiColor(colors) {
    return (t) => {
        t = clamp(t, 0, 1)

        const idx = (colors.length - 1) * t
        const lIdx = Math.floor(idx)
        const rIdx = Math.ceil(idx)

        t = idx - lIdx

        const lColor = colors[lIdx]
        const rColor = colors[rIdx]

        const result = lColor.slice()
        for (let i = 0; i < 3; i++) {
            result[i] = Math.round(result[i] + t * (rColor[i] - lColor[i]))
        }
        return result
    }
}

export function hexToRGB(hex) {
    const r = hex >> 16
    const g = (hex >> 8) & 0xff
    const b = hex & 0xff
    return [r, g, b]
}

export function rgbToHex(r, g, b) {
    const bin = (r << 16) | (g << 8) | b
    return (function(h) {
        return new Array(7 - h.length).join('0') + h
    })(bin.toString(16).toUpperCase())
}

export function rgbToNum(r, g, b) {
    return (r << 16) + (g << 8) + b
}
