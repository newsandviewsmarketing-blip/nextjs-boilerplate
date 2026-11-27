"use client";
import {useEffect,useRef,useState} from "react";
import type {DailyCall} from "@daily-co/daily-js";
import {joinSession} from "./actions";

export default function Join({id}:{id:string}) {
  const container=useRef<HTMLDivElement>(null);
  const frame=useRef<DailyCall|null>(null);
  const pending=useRef(false);
  const [message,setMessage]=useState("");
  useEffect(()=>()=>{void frame.current?.destroy();},[]);
  async function join() {
    if(pending.current || frame.current) return;
    pending.current=true;
    setMessage("Connecting…");
    try {
      const credentials=await joinSession(id);
      if(!credentials) throw Error();
      const {default:Daily}=await import("@daily-co/daily-js");
      if(!container.current) return;
      const call=Daily.createFrame(container.current,{showLeaveButton:true,iframeStyle:{width:"100%",height:"65vh",border:"0"}});
      frame.current=call;
      call.on("left-meeting",()=>{setMessage("You left the consultation.");void call.destroy();frame.current=null;});
      call.on("error",()=>setMessage("Connection interrupted. Check your network and device permissions."));
      await call.join(credentials);
      setMessage("Connected");
    } catch {
      await frame.current?.destroy();
      frame.current=null;
      setMessage("Unable to join. Check the session time and device permissions.");
    } finally {pending.current=false;}
  }
  return <div><button type="button" onClick={join}>Join consultation</button><p role="status">{message}</p><div ref={container}/></div>;
}
