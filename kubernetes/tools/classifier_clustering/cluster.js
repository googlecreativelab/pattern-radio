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
const Confirm = require('prompt-confirm')

const DATASET = 'deepblue'
const TABLE_ID = 'clustered_scores'
const OUTPUT_TABLE = `${DATASET}.${TABLE_ID}`

const MIN_ZOOM = -3
const MAX_ZOOM = 9

function makeQueryForZoom(zoom = 0){
	const oneHour = 60 * 60
	const duration = 1000 * oneHour / Math.pow(2, zoom)
	return `
		#standardsql
		INSERT ${OUTPUT_TABLE} (score, count, experiment_name, start_time, end_time, zoom)
		SELECT 
			score, count, experiment_name,
			TIMESTAMP_MILLIS(CAST(ms * ${duration} AS INT64)) AS start_time,
			TIMESTAMP_MILLIS(CAST(ms * ${duration} + ${duration} AS INT64)) AS end_time,
			${zoom} AS zoom
		FROM (
			SELECT
				experiment_name ,
				SUM(score) / (${duration} / 3840.) AS score,
				AVG(score) AS score_avg,
				COUNT(*) AS count,
				FLOOR((UNIX_MILLIS(t.time_start) + start_time_offset * 1000) / ${duration}) AS ms
			FROM
				whale_classifier.whale_classification_scores_raw c
			LEFT JOIN
				deepblue.corrected_timeoffsets t
			ON
				c.filename = t.filename
				AND c.chunk_index = t.chunk_index
			WHERE
				experiment_name IS NOT NULL
			GROUP BY
				ms, experiment_name
		)
	`
}

async function main(){
	const prompt = new Confirm(`REGENERATE ${OUTPUT_TABLE}?`)
	await prompt.run()
	const [exists] = await bigquery.dataset(DATASET).table(TABLE_ID).exists()
	if (exists){
		console.log('deleting table')
		await bigquery.dataset(DATASET).table(TABLE_ID).delete()
	}
	await bigquery.dataset(DATASET).table(TABLE_ID).create({
		schema: `
			score:FLOAT,
			experiment_name:STRING,
			count:INTEGER,
			start_time:TIMESTAMP,
			end_time:TIMESTAMP,
			zoom:INTEGER
		`
	})
	
	console.log('Running queries')

	//create all of the zoom levels
	const promises = []
	for (let zoom = MIN_ZOOM; zoom <= MAX_ZOOM; zoom++){
		promises.push(bigquery.query(makeQueryForZoom(zoom)))
	}
	const responses = await Promise.all(promises)
	console.log('done')
}

main()