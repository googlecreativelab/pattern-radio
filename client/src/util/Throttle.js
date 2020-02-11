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

export function throttle(callback, delay) {
    let isThrottled = false
    let args
    let context

    // TODO: find the es6 way of doing this.
    function wrapper() {
        if (isThrottled) {
            args = arguments // eslint-disable-line
            context = this // eslint-disable-line
            return
        }

        isThrottled = true
        callback.apply(this, arguments) // eslint-disable-line

        setTimeout(() => {
            isThrottled = false
            if (args) {
                wrapper.apply(context, args)
                args = context = null
            }
        }, delay)
    }
    return wrapper
}
