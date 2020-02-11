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

/**
 * Migrate the BigQuery DB to Spanner
 */
const {BigQuery} = require('@google-cloud/bigquery')
const {Spanner} = require('@google-cloud/spanner')
const bigquery = new BigQuery()
const spanner = new Spanner()
const pLimit = require('p-limit')
const Confirm = require('prompt-confirm')
const spannerLimit = pLimit(50)

const instance = spanner.instance('deepblue')
const database = instance.database('deepblue')

function log(message){
	process.stdout.clearLine()
	process.stdout.cursorTo(0)
	process.stdout.write(message)
}

function uploadCurrentData(){
	const classifiedTable = database.table('classification_zooms')
	spannerLimit(() => classifiedTable.upsert(currentData)).then(() => {
		log(`uploaded: ${len} / ${count}`)
	})
	currentData = []
}

let len = 0
let count = 0
let currentData = []
async function addData(data, count, force=false){
	len++
	const spannerData = {
		experiment_name: data.experiment_name,
		start_time : new Date(data.start_time.value),
		end_time: new Date(data.end_time.value),
		score: data.score,
		zoom: data.zoom,
	}
	currentData.push(spannerData)
	//grouped in 1k data points
	if (currentData.length > 1000){
		uploadCurrentData()
	}
}

async function migrate(from, to){
	const prompt = new Confirm(`REGENERATE classification_zooms?`)
	await prompt.run()

	// await database.table('classification_zooms').delete()

	// await database.createTable(
	// 	`CREATE TABLE classification_zooms(
	// 		experiment_name STRING(MAX),
	// 		start_time TIMESTAMP,
	// 		zoom INT64,
	// 		end_time TIMESTAMP,
	// 		score FLOAT64,
	// 	) PRIMARY KEY(experiment_name, zoom, start_time)`
	// )

	console.log("Deleting rows")
	try {
		const [rowCount] = await database.runPartitionedUpdate({
		  sql: `DELETE classification_zooms WHERE true = true`,
		});
		console.log(`Successfully deleted ${rowCount} records.`);
	  } catch (err) {
		console.error('ERROR:', err);
	  } 

	// fill the table
	const [response] = await bigquery.query(`select count(*) as count FROM \`${from}\``)

	count = response[0].count

	bigquery.createQueryStream(`select * from ${from}`)
		.on('data', d => {
			addData(d)
		}).on('end', () => {
			uploadCurrentData()
		})
		
}

const DATASET = 'deepblue'
const TABLE_ID = 'clustered_scores'
const OUTPUT_TABLE = `${DATASET}.${TABLE_ID}`
migrate(OUTPUT_TABLE)