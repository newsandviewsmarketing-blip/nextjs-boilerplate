"use client";
import {useState} from "react";
export default function CompanyLogo({src,name}:{src:string;name:string}){
  const [failed,setFailed]=useState(false);
  const initials=name.trim().split(/\s+/).slice(0,2).map(w=>w[0]).join("").toUpperCase();
  if(failed)return <span>{initials}</span>;
  // Stored company logos may use approved external hosts.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" width={44} height={44} loading="lazy" referrerPolicy="no-referrer" onError={()=>setFailed(true)} style={{objectFit:"contain",width:"100%",height:"100%"}}/>;
}
