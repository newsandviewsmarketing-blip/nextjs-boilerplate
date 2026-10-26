import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
const read=(path)=>readFileSync(path,"utf8");
test("one account dossier unifies editing, review, status and file provenance",()=>{
 const dossier=read("app/admin/users/[id]/page.tsx");
 const actions=read("app/admin/users/[id]/actions.ts");
 const users=read("app/admin/users/page.tsx");
 const moderation=read("app/admin/actions.ts");
 for(const required of ["Original submitted fields","role","profile"]){assert.ok(dossier.toLowerCase().includes(required.toLowerCase()))}
 for(const tag of ["id=\"identity\"","id=\"linked\"","id=\"uploads\"","id=\"actions\"","id=\"history\""]){assert.ok(dossier.includes(tag),tag)}
 assert.match(dossier,/reviewProfileAction/);
 assert.match(dossier,/reviewVeterinarianCredentialAction/);
 assert.match(dossier,/updateUserStatusAction/);
 assert.match(dossier,/updateStaffRolesAction/);
 assert.match(dossier,/updateUserPermissionsAction/);
 assert.match(dossier,/createSignedUrl/);
 assert.match(dossier,/target="_blank" rel="noopener noreferrer"/);
 assert.match(users,/admin\/users\/\$\{user.id\}/);
 assert.doesNotMatch(users,/admin-data-list user-admin-list/);
 assert.match(moderation,/requestedReturnTo === \`\/admin\/users\/\$\{entityId\}\`/);
 assert.match(actions,/requireAdminPermission\("users.manage"/);
 assert.match(actions,/Only Super Administrators/);
 assert.match(actions,/audit_logs/);
});
test("identity inputs reject promotional URLs and preserve PVMC review separation",()=>{
 const gate=read("lib/profile-name.ts");
 const auth=read("app/auth/actions.ts");
 const dashboard=read("app/dashboard/actions.ts");
 const admin=read("app/admin/users/[id]/actions.ts");
 assert.match(gate,/telegra/);
 assert.match(gate,/https\?/);
 assert.match(auth,/profileNameProblem\(fullName\)/);
 assert.match(dashboard,/profileNameProblem\(fullName\)/);
 assert.match(admin,/profileNameProblem\(fullName\)/);
 assert.match(admin,/verification decisions were not changed/);
 const status=read("app/admin/users/actions.ts");
 assert.match(status,/SUSPEND/);
 assert.match(status,/cannot suspend your own administrator account/);
});
