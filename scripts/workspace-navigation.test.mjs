import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const source=readFileSync('lib/workspace-navigation.ts','utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const {workspaceCapabilities}=await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);

test('staff and customers are not assigned a professional career by default',()=>{
 for(const roles of [[],['user'],['super_admin'],['career_admin'],['analyst'],['content_admin'],['verification_officer']]){
  assert.deepEqual(workspaceCapabilities(roles),{professional:false,clinic:false,company:false,laboratory:false});
 }
});
test('a veterinarian can hold career, clinic and delegated company activities together',()=>{
 assert.deepEqual(workspaceCapabilities(['veterinarian'],true),{professional:true,clinic:true,company:true,laboratory:false});
 assert.equal(workspaceCapabilities(['professional'],true).company,true);
 assert.equal(workspaceCapabilities(['professional'],false).company,false);
});
test('company and laboratory identities do not imply veterinary credentials or personal CV access',()=>{
 assert.deepEqual(workspaceCapabilities(['company']),{professional:false,clinic:true,company:true,laboratory:false});
 assert.deepEqual(workspaceCapabilities(['laboratory']),{professional:false,clinic:false,company:false,laboratory:true});
 assert.equal(workspaceCapabilities(['candidate']).clinic,false);
 assert.equal(workspaceCapabilities(['candidate']).professional,true);
 assert.equal(workspaceCapabilities(['super_admin','professional']).professional,true);
});
