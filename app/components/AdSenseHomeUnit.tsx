"use client";
import {useEffect,useRef} from "react";
import Script from "next/script";

declare global { interface Window { adsbygoogle?: unknown[] } }
export default function AdSenseHomeUnit({client,slot}:{client:string;slot:string}){
 const initialized=useRef(false);
 useEffect(()=>{
  if(initialized.current)return;
  const ad=document.querySelector<HTMLElement>(".vc-home-google-ad ins.adsbygoogle");
  if(!ad)return;
  initialized.current=true;
  try{(window.adsbygoogle=window.adsbygoogle||[]).push({});}catch{initialized.current=false;}
 },[]);
 return <>
  <Script strategy="afterInteractive" async src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`} crossOrigin="anonymous"/>
  <ins className="adsbygoogle" style={{display:"block"}} data-ad-client={client} data-ad-slot={slot} data-ad-format="auto" data-full-width-responsive="true"/>
 </>;
}
