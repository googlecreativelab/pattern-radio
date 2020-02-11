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
require('moment-timezone')
const moment = require('moment')
const fs = require('fs')
const { resolve } = require('path')

const bigQueryLimit = pLimit(45)

function toUTC(date){
	return date.toISOString().replace('T', ' ').replace(/\.(\d+)Z/, ' UTC')
}

function createRangeQuery(start, end){
	return [
		'SELECT AVG(score) FROM`gweb-deepblue.whale_classifier.whale_classification_scores_raw`',
		'WHERE LOWER(filename) LIKE "hawaii%"',
		`AND start_time >= "${toUTC(start)}"`,
		`AND start_time < "${toUTC(end)}"`,
	].join(' ')
}

async function averageBetween(start, end, chunkTime){
	const startTime = start.valueOf()
	const endTime = end.valueOf()

	const fileName = `${start.format('YYYY-MM-DD')}_to_${end.format('YYYY-MM-DD')}_duration_${moment.duration(chunkTime).asHours()}_hours`
	
	const queries = []
	for (let time = startTime; time <= endTime; time += chunkTime){
		queries.push(createRangeQuery(new Date(time), new Date(time+chunkTime)))
	}

	const progressBar = progressBars.newBar('hawaii: [:bar]', {
		total : queries.length,
	})

	const promises = queries.map(query => {
		return bigQueryLimit(async () => {
			const [[data]] = await bigquery.query(query)
			progressBar.tick()
			return Object.values(data)[0]
		})
	})

	const responses = await Promise.all(promises)

	fs.writeFileSync(resolve(__dirname, 'data', `${fileName}.json`), JSON.stringify(responses, undefined, '\t'))
}

averageBetween(moment('2013-11-01'), moment('2014-06-28'), 6 * 60 * 60 * 1000)
