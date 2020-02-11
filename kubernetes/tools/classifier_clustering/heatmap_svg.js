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

const window = require('svgdom')
const document = window.document
const {SVG, registerWindow} = require('@svgdotjs/svg.js')
const fs = require('fs');
const interpolate = require('color-interpolate');


const DATASET = 'deepblue'
const TABLE_ID = 'clustered_scores'
const OUTPUT_TABLE = `${DATASET}.${TABLE_ID}`

function makeQuery(duration){
	return `
		#standardsql
		SELECT *, TIMESTAMP_SECONDS(CAST(sec AS INT64) * ${duration}) AS time
		FROM (
		SELECT
			SUM(score) / (${duration} / 3.84) AS score,
			AVG(score) AS score_avg,
			COUNT(*) AS count,
			FLOOR((UNIX_SECONDS(cast(start_time as TIMESTAMP)) + start_time_offset) / ${duration}) as sec
		FROM
			whale_classifier.whale_classification_scores_raw c
		WHERE 
			LOWER(filename) LIKE "tinian%"
		GROUP BY
			sec
		)
		--WHERE 
		--TIMESTAMP_SECONDS(CAST(sec AS INT64) * ${duration}) > "2014-03-25 00:00:00 UTC" 
		--AND 
		--TIMESTAMP_SECONDS(CAST(sec AS INT64) * ${duration}) < "2014-06-28 00:00:00 UTC" 
		order by time asc

	`	

	return `
	#standardsql
	SELECT *, TIMESTAMP_SECONDS(CAST(sec AS INT64) * ${duration}) AS time
	FROM (
	SELECT
		experiment_name ,
		SUM(score) / (${duration} / 3.84) AS score,
		AVG(score) AS score_avg,
		COUNT(*) AS count,
		FLOOR((UNIX_SECONDS(t.time_start) + start_time_offset) / ${duration}) AS sec
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
		sec, experiment_name
	)
	order by time asc

`	
}
const scale = (num, in_min, in_max, out_min, out_max) => {
	return (num - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
  }

function LowpassFilter(Fc) {
    var Q = 0.707;
    var K = Math.tan(Math.PI * Fc);
    var norm = 1 / (1 + K / Q + K * K);
    this.a0 = K * K * norm;
    this.a1 = 2 * this.a0;
    this.a2 = this.a0;
    this.b1 = 2 * (K * K - 1) * norm;
    this.b2 = (1 - K / Q + K * K) * norm;
    this.z1 = this.z2 = 0;
    this.value = 0;
    this.tick = function(value) {
        var out = value * this.a0 + this.z1;
        this.z1 = value * this.a1 + this.z2 - this.b1 * out;
        this.z2 = value * this.a2 - this.b2 * out;
        return out;
    };
}

async function main(){
	let timeDiv = 24
	let duration = 86400 / timeDiv
	let resp = (await bigquery.query(makeQuery(duration)))[0]
	console.log(resp)

	// let filter = new LowpassFilter(0.1)

	let colormap = interpolate(["#21163d", "#2e70f9", "#9ffdff"	]);
	// let colormap = interpolate(['#1D1C41', '#2A4592', "#74A5D7"]);

	const minTime = resp[0].sec 
	const maxTime = resp[resp.length-1].sec 


	console.log(minTime, maxTime)
	// register window and document
	registerWindow(window , window.document)

	// create canvas
	const canvas = SVG(document.documentElement)

	const scaleFactor =  0.5* timeDiv

	let min = 1;
	let max = 0;

	for(const row of resp){
		let s = row.score_avg 
		if(s < min) min = s
		if(s > max) max = s
	}

	for(const row of resp){
		const v = (row.score_avg)
		// const v = filter.tick(row.score_avg)
		const c = scale(v, min, max, 0, 1)
		// const c = Math.round(row.score * 255)
		// const color = `rgb(${c}, ${c},${c})`
		const color = colormap(c)
		canvas.rect(10 / scaleFactor,300).fill(color).move(
			(row.sec - minTime) * 7 / scaleFactor,
			0)
	}

	// use svg.js as normal
	

	// get your svg as string
	// console.log(canvas.svg())

	fs.writeFileSync("out.svg", canvas.svg())
	// or
	// console.log(canvas.node.outerHTML)

}

main()