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

const { Spanner } = require('@google-cloud/spanner')
const pLimit = require('p-limit')
const spanner = new Spanner()
const instance = spanner.instance('deepblue')
const database = instance.database('deepblue')
const Confirm = require('prompt-confirm')

async function main(){
	const databaseName = 'classification_zooms'
	const prompt = new Confirm(`Delete all items from ${databaseName}`)
	await prompt.run()	
	console.log('deleting table')
	await database.table(databaseName).delete()
	console.log('creating table')
	const tableScheme = `CREATE TABLE ${databaseName} (
		zoom INT64 NOT NULL,
		location STRING(MAX) NOT NULL,
		time TIMESTAMP NOT NULL,
		mean FLOAT64,
		max FLOAT64,
		end_time TIMESTAMP,
		) PRIMARY KEY(zoom, location, time)`
	await database.createTable(tableScheme)
}

main()
