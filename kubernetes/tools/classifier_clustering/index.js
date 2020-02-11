// Copyright 2019 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

const { BigQuery } = require('@google-cloud/bigquery')
const bigquery = new BigQuery()
const pLimit = require('p-limit')
const Multiprogress = require('multi-progress')
var progressBars = new Multiprogress(process.stderr)

const { Spanner } = require('@google-cloud/spanner')
const spanner = new Spanner()

const bigQueryLimit = pLimit(40)
const spannerLimit = pLimit(50)

const instance = spanner.instance('deepblue')
const database = instance.database('deepblue')

async function getAllFiles(){
	const [results] = await database.run({
		sql : 'SELECT DISTINCT original_filename FROM audio_subchunks'
	})
	//now find the offset for each of the chunks
	const filenames = results.map(([filename]) => filename.value)
	const stats = {}
	filenames.forEach(f => stats[f] = { total : 0, processed : 0 })
	await Promise.all(filenames.map(file => {
		return spannerLimit(() => {
			return getFileChunks(file, stats[file])
		})
	}))
}

async function getFileChunks(file){
	//get all of the chunks for a specific file
	const [results] = await database.run({
		sql : `SELECT location, time_start, chunk_index FROM audio_subchunks WHERE original_filename = "${file}"`
	})
	const chunks = results.map(([location, time_start, chunk_index]) => {
		return {
			location : location.value,
			time_start : time_start.value,
			chunk_index : parseInt(chunk_index.value.value),
			original_filename : file
		}
	})
	const progressBar = progressBars.newBar(`${file}: [:bar]`, {
		total : chunks.length,
	})
	// console.log(`getting scores for ${file}`)
	await Promise.all(chunks.map(chunk => {
		return bigQueryLimit(() => {
			progressBar.tick()
			return getChunkScore(chunk)
		})
	}))
}

async function getChunkScore(chunk){
	const query = [
		'SELECT score, start_time_offset',
		'FROM `gweb-deepblue.whale_classifier.whale_classification_scores_raw`',
		`WHERE chunk_index = ${chunk.chunk_index} AND filename = "${chunk.original_filename}"`,
		'ORDER BY start_time_offset'
	].join(' ')

	const [response] = await bigquery.query(query)

	const data = response.map(({ score, start_time_offset }) => {
		return {
			score,
			location : chunk.location,
			time : new Date(chunk.time_start.getTime() + start_time_offset * 1000)
		}
	})

	await uploadData(data)
}

async function uploadData(data){
	const classifiedTable = database.table('classified')
	await classifiedTable.upsert(data)
}

getAllFiles()
