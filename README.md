# Pattern Radio: Whale Songs

[Pattern Radio](https://patternradio.withgoogle.com) lets you navigate thousands of hours of underwater recordings in your browser. The experiment is split into two main components, [the backend code](./kubernetes/README.md), which uses Kubernetes to render thousands of spectrogram images from NOAA's audio dataset and place them into a Google Storage Bucket for the client-side to download, and the [the browser code](./client/README.md) which uses WebGL to render all of these pre-rendered images. 

![screenshot](preview.gif)

We encourage open sourcing projects as a way of learning from each other. Please respect our and other creators’ rights, including copyright and trademark rights when present, when sharing these works and creating derivative work. If you want more info on Google's policy, you can find that [here](https://www.google.com/permissions/).

You can get in touch with the team on [patternradio-support@google.com](mailto:patternradio-support@google.com)

This is an experiment, not an official Google product. We’ll do our best to support and maintain this experiment but your mileage may vary.
