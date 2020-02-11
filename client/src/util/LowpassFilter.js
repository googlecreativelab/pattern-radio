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

export default function LowpassFilter(Fc, Q = 0.707) {
    const K = Math.tan(Math.PI * Fc)
    const norm = 1 / (1 + K / Q + K * K)
    this.a0 = K * K * norm
    this.a1 = 2 * this.a0
    this.a2 = this.a0
    this.b1 = 2 * (K * K - 1) * norm
    this.b2 = (1 - K / Q + K * K) * norm
    this.z1 = this.z2 = 0
    this.value = 0
    this.tick = function(value) {
        const out = value * this.a0 + this.z1
        this.z1 = value * this.a1 + this.z2 - this.b1 * out
        this.z2 = value * this.a2 - this.b2 * out
        return out
    }
}
