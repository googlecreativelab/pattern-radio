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

echo "Getting current deployment"
kubectl get deployments similarity -o wide

if [ -z "$1" ]
then
    echo "Need to supply a version number like 'v38'"
else
    echo "Building similarity:$1"

    cd ../
    gcloud docker -- build -t gcr.io/gweb-deepblue/similarity:$1 -f similarity/Dockerfile .
    cd -

    gcloud docker -- push  gcr.io/gweb-deepblue/similarity:$1
    kubectl set image deployments similarity similarity=gcr.io/gweb-deepblue/similarity:$1
    kubectl apply -f hpa.yaml

    echo "Deployed $1"
fi