"use client";
import {useEffect,useState} from "react";
import {consultationHeartbeat} from "./actions";
export default function Presence({active}:{active:boolean}) {
  const [state,setState]=useState("Waiting for presence confirmation");
  useEffect(()=>{
    if (!active) return;
    let stopped=false, busy=false;
    async function tick(){
      if (busy || stopped || document.visibilityState!=="visible") return;
      busy=true;
      try { const ok=await consultationHeartbeat(); if(!stopped)setState(ok?"Presence heartbeat confirmed":"Presence unavailable"); }
      catch {if(!stopped)setState("Presence unavailable");}
      finally{busy=false;}
    }
    void tick(); const timer=window.setInterval(()=>void tick(),45000);
    document.addEventListener("visibilitychange",tick);
    return ()=>{stopped=true;window.clearInterval(timer);document.removeEventListener("visibilitychange",tick);};
  },[active]);
  return active?<p role="status">{state}. Keep this workspace open and visible. Status expires after 90 seconds without a heartbeat.</p>:null;
}
