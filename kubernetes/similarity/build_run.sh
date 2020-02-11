#!/bin/bash -eu
#
# Copyright 2019 Google Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

#!/bin/bash

cd ../
docker  build  -t gcr.io/gweb-deepblue/similarity -f similarity/Dockerfile .
cd -

docker run --rm \
-v $(pwd)/.:/similarity/ \
-v $(pwd)/../common_lib/:/common_lib/ \
-v $(pwd)/../../service-account.json:/service-account.json  \
-e GOOGLE_APPLICATION_CREDENTIALS=/service-account.json \
gcr.io/gweb-deepblue/similarity \
# "Hawaii" 1024 "2015-01-12 19:44:22.500000 +0000" "2015-01-12 19:45:45.000000 +0000" "deepblue-spectrograms-denoise" 60