// Run the existing release gate against distributable sources after building.
// Installed modules and build output are inputs to verification, not source files.
import {execFileSync} from "node:child_process";
import {mkdtempSync,cpSync,rmSync,mkdirSync,existsSync} from "node:fs";
import {tmpdir} from "node:os";
import {join,dirname} from "node:path";

const stage=mkdtempSync(join(tmpdir(),"vetconnect-release-"));
try {
  // Tracked files are always included, even if a subsequent ignore rule matches.
  const list=execFileSync("git",["ls-files","-z","--cached","--others","--exclude-standard"],{encoding:"utf8"}).split("\0").filter(Boolean);
  for(const path of list) {
    mkdirSync(dirname(join(stage,path)),{recursive:true});
    cpSync(path,join(stage,path));
  }
  // Private local configuration must be kept out of a source package.
  if(!existsSync(join(stage,"scripts/release-gate.mjs"))) throw Error("Missing source release gate");
  execFileSync(process.execPath,["scripts/release-gate.mjs"],{cwd:stage,stdio:"inherit"});
} finally {rmSync(stage,{recursive:true,force:true});}
