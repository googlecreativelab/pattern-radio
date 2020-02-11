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

import { Filter } from 'pixi.js'

export class ColorMapFilter extends Filter {
    constructor(options) {
        const fragment = `
            uniform vec3 darkColor;
            uniform vec3 lightColor;
            varying vec2 vTextureCoord;
            uniform sampler2D uSampler;
            void main(){
                vec4 color = texture2D(uSampler, vTextureCoord.xy);
                gl_FragColor = vec4(mix(darkColor, lightColor, color.r), 1.0);
            }
            `

        const darkColor = [23/256, 36/256, 67/256]
        const lightColor = [0, 240/256, 233/256]

        const uniformsData = {
            darkColor: {
                type: 'vec3',
                value: darkColor,
            },
            lightColor: {
                type: 'vec3',
                value: lightColor,
            },
        }
        super(null, fragment, uniformsData)

        this.uniformData = uniformsData
    }

    set darkColor(c) {
        this.uniforms.darkColor = c.map((x) => x / 256)
    }

    get darkColor() {
        return this.uniforms.darkColor.map((x) => x * 256)
    }

    set lightColor(c) {
        this.uniforms.lightColor = c.map((x) => x / 256)
    }

    get lightColor() {
        return this.uniforms.lightColor.map((x) => x * 256)
    }
}
