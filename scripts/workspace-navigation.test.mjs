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


test('multi-company actions cannot silently default to the first employer',()=>{
 const workspace=readFileSync('app/dashboard/company/workspace.ts','utf8');
 const actions=readFileSync('app/dashboard/company/actions.ts','utf8');
 const page=readFileSync('app/dashboard/company/page.tsx','utf8');
 const editor=readFileSync('app/dashboard/company/products/[id]/page.tsx','utf8');
 const chooser=readFileSync('app/dashboard/company/select/page.tsx','utf8');
 assert.match(workspace,/workspaces\.length > 1 && !requestedCompanyId/);
 assert.match(workspace,/item\.company_id === requestedCompanyId/);
 assert.match(workspace,/requireCompanyPermission\(permission: CompanyPermission, companyId\?: string\)/);
 assert.match(actions,/requireCompanyPermission\(permission, companyId \|\| undefined\)/);
 assert.equal((actions.match(/requireWorkspace\("[a-z.]+", formData\)/g)||[]).length,7);
 assert.match(page,/getCurrentCompanyWorkspace\(params\.company\)/);
 for(const action of ['updateCompanyProfileAction','createProductAction','deletePendingProductAction','createJobAction','deletePendingJobAction','updateInquiryStatusAction'])
  assert.match(page,new RegExp('action=\\{'+action+'\\}\\><input type="hidden" name="company_id"'));
 assert.match(editor,/getCurrentCompanyWorkspace\(formParams\.company\)/);
 assert.match(editor,/name="company_id" value=\{workspace\.company_id\}/);
 assert.match(chooser,/get_my_company_workspaces/);
 assert.match(chooser,/company\.company_id/);
});

test('multiple laboratory ownership requires an explicit selected facility',()=>{
 const lab=readFileSync('app/dashboard/laboratory/page.tsx','utf8');
 const actions=readFileSync('app/dashboard/laboratory/actions.ts','utf8');
 assert.match(lab,/ownedLabs\.length===1\?ownedLabs\[0\]:messages\.lab\?/);
 assert.match(lab,/ownedLabs\.find\(item=>item\.id===messages\.lab\)/);
 assert.match(lab,/Choose your laboratory/);
 assert.match(lab,/Switch laboratory/);
 assert.match(actions,/\.eq\("id",labId\)\.eq\("owner_id",identity\.userId\)/);
 assert.match(actions,/encodeURIComponent\(labId\)/);
});
