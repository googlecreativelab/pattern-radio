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

import { GUI } from '../Dat'
import { AdjustmentFilter } from '@pixi/filter-adjustment'
import { ColorMapFilter } from './ColorMap'

export const adjustmentFilter = new AdjustmentFilter()
// some baseline props
adjustmentFilter.gamma = 0.9
adjustmentFilter.brightness = 3.2
adjustmentFilter.contrast = 1.5
if (GUI) {
    GUI.add(adjustmentFilter, 'brightness', 0, 10)
    GUI.add(adjustmentFilter, 'contrast', 0, 2)
    GUI.add(adjustmentFilter, 'gamma', 0, 1)
}

export const colorMapFilter = new ColorMapFilter()

if (GUI) {
    GUI.addColor(colorMapFilter, 'darkColor')
    GUI.addColor(colorMapFilter, 'lightColor')
}

export const spectrogramFilters = [adjustmentFilter, colorMapFilter]
