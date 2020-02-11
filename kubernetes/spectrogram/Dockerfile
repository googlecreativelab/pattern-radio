FROM python:3-slim
RUN apt-get update && apt-get install -y ffmpeg
RUN apt-get update && apt-get install -y libtiff5-dev zlib1g-dev \
    libfreetype6-dev liblcms2-dev libwebp-dev libharfbuzz-dev libfribidi-dev \
    tcl8.6-dev tk8.6-dev python-tk
COPY spectrogram/requirements.txt .
RUN pip install -r requirements.txt
COPY common_lib/ ./common_lib
COPY spectrogram/ ./spectrogram
ENTRYPOINT ["python", "-m", "spectrogram.spectrogram"]