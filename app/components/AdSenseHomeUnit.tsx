"use client";
import {useEffect,useRef} from "react";

declare global { interface Window { adsbygoogle?: unknown[] } }
export default function AdSenseHomeUnit({client,slot}:{client:string;slot:string}){
 const initialized=useRef(false);
 useEffect(()=>{
  if(initialized.current)return;
  const ad=document.querySelector<HTMLElement>(".vc-home-ad-placement ins.adsbygoogle");
  if(!ad)return;
  initialized.current=true;
  try{(window.adsbygoogle=window.adsbygoogle||[]).push({});}catch{initialized.current=false;}
 },[]);
 return <ins className="adsbygoogle" style={{display:"block"}} data-ad-client={client} data-ad-slot={slot} data-ad-format="auto" data-full-width-responsive="true"/>;
}
