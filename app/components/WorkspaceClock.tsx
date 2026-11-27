"use client";
import {useSyncExternalStore} from "react";
const format=new Intl.DateTimeFormat("en-PK",{timeZone:"Asia/Karachi",hour:"2-digit",minute:"2-digit",hour12:true,day:"2-digit",month:"short",year:"numeric"});
function subscribe(callback:()=>void){const timer=setInterval(callback,1000);return ()=>clearInterval(timer);}
function snapshot(){return format.format(new Date());}
function serverSnapshot(){return "";}
export default function WorkspaceClock(){const value=useSyncExternalStore(subscribe,snapshot,serverSnapshot);return <span className="vc-workspace-clock" aria-label="Pakistan Standard Time">{value||"Pakistan time"} <small>PKT</small></span>;}
