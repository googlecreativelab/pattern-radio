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

export function msToTime(ms) {
    return new Date(ms).toUTCString()
}

export function dateToUTCDateTimeString(date) {
    return date.toUTCString().slice(5, date.toUTCString().length)
}

export function msToDate(ms) {
    const date = new Date(ms)
    const monthTitles = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const day = date.getUTCDate()
    const month = monthTitles[date.getUTCMonth()]
    const year = date.getUTCFullYear()
    return `${month} ${day}, ${year}`
}
