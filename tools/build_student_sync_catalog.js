'use strict';
const fs=require('node:fs'),path=require('node:path');
const folder=path.resolve(__dirname,'../site/data');
const records=JSON.parse(fs.readFileSync(path.join(folder,'records_core.json'),'utf8'));
fs.writeFileSync(path.join(folder,'student-sync-catalog.json'),JSON.stringify(records.map(r=>[r.id,r.schoolName,r.departmentName||r.schoolName,r.year,r.channel])));
console.log('Prepared public admissions catalog for validated student tracking.');
