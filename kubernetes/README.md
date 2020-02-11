# Pattern Radio Kubernetes

There are 4 kubernetes jobs that process the dataset for the frontend to consume. All the jobs get triggered by Pub/Sub messages in [tools/trigger/trigger.py](tools/trigger/trigger.py). All the jobs have a [validator script](tools/trigger/validation.py) that verifies all files have been created. The jobs have to run sequentially. 

## 1. Transcode 

The transcode job takes raw x.wav files. These are the raw files from the NOAA HARP dataset that have a special header with metadata information in them. The jobs downloads the raw audio, reads the header of the file, chunks the file into shorter chunks, exports and uploads an mp3 and wav version of the chunks to cloud storage. 

## 2. Spectrogram

The spectrogram job takes the wav files generated in the transcode job, and generates a spectrogram image from it. It additionally loads all the spectrograms for a given file, and calculates the median spectrogram, used to denoise the spectrogram (read [Kyle's blogpost](https://medium.com/@kcimc/data-of-the-humpback-whale-9ef09c5920cd) for indepth description). The spectrogram files are then uploaded to cloud storage.

## 3. Spectrogram tiler

The tiler takes a time range and output width as parameter, and generates a tile with all the spectrograms for that timerange. This job is triggered at several zoom levels, and the tiles created are the ones downloaded by the frontend. The tiles are all generated at a predicted filename, so the frontend can easily fetch the tiles without looking up a database.

## 4. Similarity

This process uses the techniques described in [Kyle's blogpost](https://medium.com/@kcimc/data-of-the-humpback-whale-9ef09c5920cd) to generate a similarity comparison image, that is uesd by the frontend to highlight similar sound units when zoomed all the way in. It takes the same arguments as the spectrogram tiler job, and loads the denoised spectrogram tiles for that time range, and calculates the similarity to a window of time around it.

# Development

You need a kubernets cluster on Google Cloud in order to deploy this. The docker images can also be run locally.

Configuration
```
gcloud config set compute/zone us-central1-a
gcloud container clusters get-credentials high-mem-cluster-1
gcloud auth configure-docker
```

Build image
```
# Make sure to update the version code 
docker build -t gcr.io/<CLOUD PROJECT ID>/transcode:v<NEW VERSION> -i transcode/Dockerfile .
docker push gcr.io/<CLOUD PROJECT ID>/transcode:v<NEW VERSION>
```

Run locally to test (from inside `/transcode`)

```
./build_and_run.sh
```

Deploy
```
./deploy.sh
```