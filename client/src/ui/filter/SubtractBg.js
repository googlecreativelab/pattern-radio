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

import { Filter } from 'pixi.js';

const vertex = `
	attribute vec2 aVertexPosition;
	attribute vec2 aTextureCoord;

	uniform mat3 projectionMatrix;

	varying vec2 vTextureCoord;

	void main(void)
	{
		gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
		vTextureCoord = aTextureCoord;
	}`

const fragment = `
	varying vec2 vTextureCoord;
	uniform sampler2D uSampler;

	uniform float min;
	uniform float exponent;

	void main(void)
	{
		vec4 c = texture2D(uSampler, vTextureCoord);

		float max = 1.0;
		vec4 scaled = (max - min) * (c - min);

		vec4 exp = vec4(exponent);

		gl_FragColor = clamp(pow(scaled, exp), 0.0, 1.0);
	}
`

export class SubtractBackgroundFilter extends Filter {
	constructor(options) {
		super(vertex, fragment);

		this.min = 0.1
		this.exponent = 1
	}

	apply(filterManager, input, output, clear) {
		this.uniforms.min = this.min;
		this.uniforms.exponent = this.exponent;

		filterManager.applyFilter(this, input, output, clear);
	}
}