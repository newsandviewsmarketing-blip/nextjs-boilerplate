"use client";
export default function PrintButton(){
 return <div className="print-toolbar" style={{display:"flex",gap:12,marginBottom:24}}>
  <button type="button" onClick={()=>window.print()}>Print / Save as PDF</button>
  <a href="/dashboard/career/cv">Edit CV</a>
  <style>{`@media print{.print-toolbar{display:none!important}body{background:white!important}}`}</style>
 </div>
}