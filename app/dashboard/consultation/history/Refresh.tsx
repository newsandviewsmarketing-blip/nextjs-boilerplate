"use client";
import {useEffect} from "react";
import {useRouter} from "next/navigation";
export default function Refresh() {
  const router=useRouter();
  useEffect(()=>{
    function refresh(){if(document.visibilityState==="visible") router.refresh();}
    const timer=window.setInterval(refresh,15000);
    document.addEventListener("visibilitychange",refresh);
    return ()=>{window.clearInterval(timer);document.removeEventListener("visibilitychange",refresh);};
  },[router]);
  return null;
}
