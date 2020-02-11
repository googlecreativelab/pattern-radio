# Tools
Handy tools for manual usage

## Setup 
Setup pipenv

```
pipenv install
pipenv shell 
```

## Run command
```
python trigger-job.py --help
```

## Run jobs
Run transcode on files
```
python trigger-job.py --transcode --prefix Hawaii19
```

Run spectrogram generation
```
python trigger-job.py --spectrogram --prefix Hawaii19
```

Run cluster classifier
```
python trigger-job.py --cluster-classifier --prefix Hawaii19
```



# Using pubsub emulator
Install emulator 

```
gcloud components install pubsub-emulator
```

Start emulator

```
gcloud beta emulators pubsub start
```

Init env variables, and setup paths

```
$(gcloud beta emulators pubsub env-init)
./pubusub_emulator_setup.sh
```

Route docker image to emulator by adding following line in build_run.sh under docker run

```
-e PUBSUB_EMULATOR_HOST=host.docker.internal:8085 \
```

