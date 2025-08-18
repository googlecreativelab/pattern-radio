<table>
  <tr>
    <td>
      This project is no longer actively maintained by the Google Creative Lab but remains here in a read-only Archive mode so that it can continue to assist developers that may find the examples helpful. We aren’t able to address all pull requests or bug reports but outstanding issues will remain in read-only mode for reference purposes. Also, please note that some of the dependencies may not be up to date and there hasn’t been any QA done in a while so your mileage may vary.
      <br><br>
      For more details on how Archiving affects Github repositories see <a href="https://docs.github.com/en/github/creating-cloning-and-archiving-repositories/about-archiving-repositories">this documentation </a>.
      <br><br>
      <b>We welcome users to fork this repository</b> should there be more useful, community-driven efforts that can help continue what this project began.
    </td>
  </tr>
</table>

# Pattern Radio: Whale Songs

[Pattern Radio](https://patternradio.withgoogle.com) lets you navigate thousands of hours of underwater recordings in your browser. The experiment is split into two main components, [the backend code](./kubernetes/README.md), which uses Kubernetes to render thousands of spectrogram images from NOAA's audio dataset and place them into a Google Storage Bucket for the client-side to download, and the [the browser code](./client/README.md) which uses WebGL to render all of these pre-rendered images. 

![screenshot](preview.gif)

We encourage open sourcing projects as a way of learning from each other. Please respect our and other creators’ rights, including copyright and trademark rights when present, when sharing these works and creating derivative work. If you want more info on Google's policy, you can find that [here](https://www.google.com/permissions/).

You can get in touch with the team on [patternradio-support@google.com](mailto:patternradio-support@google.com)

This is an experiment, not an official Google product. We’ll do our best to support and maintain this experiment but your mileage may vary.
