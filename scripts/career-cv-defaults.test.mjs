import assert from 'node:assert/strict';
import {test} from 'node:test';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
const source=readFileSync('lib/career-cv-defaults.ts','utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const {careerCvDefaults}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const input={name:'Candidate',email:'candidate@example.com',phone:null,headline:'Nutritionist',skills:['Feed formulation'],education:[{degree:'BS',institution:'University'},{degree:'MS',institution:'Institute'}],experience:[{designation:'Intern',organization_name:'Farm',responsibilities:'Feed records'}]};
test('prefills all qualifications and experience from the authenticated owner profile',()=>{
 const cv=careerCvDefaults(null,input);
 assert.equal(cv.education,'BS | University\nMS | Institute');
 assert.equal(cv.experience,'Intern | Farm | Feed records');
 assert.equal(cv.contact_email,input.email);
 assert.equal(cv.skills,'Feed formulation');
});
test('saved CV wins, including deliberate omissions',()=>{
 const saved={full_name:'My name',phone:null,education:''};
 assert.deepEqual(careerCvDefaults(saved,input),saved);
});
test('missing optional profile fields remain blank without invented work experience',()=>{
 const cv=careerCvDefaults(null,{name:'New candidate',email:'new@example.com',phone:null,education:[],experience:[]});
 assert.equal(cv.experience,'');assert.equal(cv.education,'');assert.equal(cv.headline,'');
});

test('current role already saved during registration is reused without inventing dates',()=>{
 const cv=careerCvDefaults(null,{...input,experience:[],registration:{current_designation:'Nutritionist',current_workplace:'Feed Mill'}});
 assert.equal(cv.experience,'Nutritionist | Feed Mill');
});
