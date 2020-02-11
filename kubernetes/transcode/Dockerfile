FROM python:3-slim
RUN apt-get update &&  apt-get install -y ffmpeg
COPY transcode/requirements.txt ./
RUN pip install -r /requirements.txt
COPY common_lib/ /common_lib
COPY transcode/ /transcode/
# WORKDIR /transcode/
RUN python -m transcode.tests.process_audio_test
RUN python -m transcode.tests.read_xwav_header_test
ENTRYPOINT ["python", "-m", "transcode.src.transcode"]