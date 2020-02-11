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
const { Storage } = require('@google-cloud/storage')

const util = require('util');
const exec = util.promisify(require('child_process').exec);

const spanner = new Spanner()
const instance = spanner.instance('deepblue')
const database = instance.database('deepblue')
const Confirm = require('prompt-confirm')
const output_table = "deepblue.corrected_timeoffsets"

const storage = new Storage({
  projectId: 'gweb-deepblue',
});
 
async function main(){
	const prompt = new Confirm(`Create json file with all timeoffsets, and update ${output_table} in bigquery?`)
	if(await prompt.run()){
    
        const sql = [
            'SELECT chunk_index, original_filename as filename, time_start, time_offset, duration, experiment_name FROM audio_subchunks',
            'ORDER BY original_filename, time_start',
            // 'LIMIT 300',
        ].join(' ')
        let [results] = await database.run({ sql }, {json:true})
        console.log(results.length, "rows")

        const bucket = storage.bucket('deepblue-temp')
        const file = bucket.file('corrected-timeoffsets.json')

        const writeStream = file.createWriteStream({resumable: false})

        for(const res of results){
            const json = res.toJSON()
            json.time_start = json.time_start.toISOString()
            writeStream.write(JSON.stringify(json))
            writeStream.write('\n')
        }

        writeStream.end()

        await exec('bq rm --force --table deepblue.corrected_timeoffsets');
        await exec('bq mk --external_table_definition=duration:FLOAT,time_offset:FLOAT,time_start:TIMESTAMP,filename:STRING,chunk_index:INTEGER,experiment_name:STRING@NEWLINE_DELIMITED_JSON=gs://deepblue-temp/corrected-timeoffsets.json '+output_table);
        console.log("Updated "+output_table)
    }
}

main()
