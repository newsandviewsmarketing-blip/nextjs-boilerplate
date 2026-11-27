"use client";
import {useState,useTransition} from "react";
import {testProvider} from "./actions";
export default function ProviderTest(){
 const [message,setMessage]=useState("");const [pending,startTransition]=useTransition();
 return <div><button type="button" className="button button-secondary" disabled={pending} onClick={()=>startTransition(async()=>{setMessage("");try{const result=await testProvider();setMessage(result.message);}catch{setMessage("Provider check could not be completed.");}})}>{pending?"Testing…":"Test provider REST authentication"}</button><p role="status">{message}</p></div>;
}
