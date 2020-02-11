## Overview

Pattern Radio lets you navigate thousands of hours of underwater recordings in your browser. The spectrograms for all of the audio are generated using an offline task run on Kubernetes. See (this README)[../kubernetes/README.md] for reference on how we did that. 

## Installation

Make sure that you've got node and npm installed. To install all of the dependencies run:

`npm install`

Then to build the code and start a server run: 

`npm run watch`

You can then view the experiment running locally at http://localhost:8080/build/