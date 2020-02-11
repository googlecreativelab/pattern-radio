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
docker build -t gcr.io/gweb-deepblue/transcode -f transcode/Dockerfile .
cd -

docker run --rm \
-v $(pwd)/src:/transcode/src \
-v $(pwd)/../../service-account.json:/service-account.json  \
-e GOOGLE_APPLICATION_CREDENTIALS=/service-account.json \
gcr.io/gweb-deepblue/transcode \
"ShippedHDD/Hawaii19K_DL10_141202_011500.df20.x.wav"

# Tests:
# docker run --rm \
# --entrypoint "" \
# -v /Users/jongejan/Downloads/Hawaii19K_DL10_150223_024718.df20.x.wav:/Hawaii19K_DL10_150223_024718.df20.x.wav \
# -v $(pwd)/:/transcode/ \
# -v $(pwd)/../../service-account.json:/service-account.json  \
# -e GOOGLE_APPLICATION_CREDENTIALS=/service-account.json \
# gcr.io/gweb-deepblue/transcode python -u -m tests.process_audio_test
 
