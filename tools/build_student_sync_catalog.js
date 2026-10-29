'use strict';
const fs=require('node:fs'),path=require('node:path');
const folder=path.resolve(__dirname,'../site/data');
const records=JSON.parse(fs.readFileSync(path.join(folder,'records_core.json'),'utf8'));
const context={window:{}};require('node:vm').runInNewContext(fs.readFileSync(path.join(__dirname,'../site/admission-catalog.js'),'utf8'),context);
const special=[115,116].flatMap(year=>JSON.parse(fs.readFileSync(path.join(folder,'special_admissions_'+year+'.json'),'utf8')).records);
records.push(...context.window.AdmissionCatalog.initialize(records,special));
fs.writeFileSync(path.join(folder,'student-sync-catalog.json'),JSON.stringify(records.map(r=>[r.id,r.schoolName,r.departmentName||r.schoolName,r.year,r.channel])));
console.log('Prepared public admissions catalog for validated student tracking.');
