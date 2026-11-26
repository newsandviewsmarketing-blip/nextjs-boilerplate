"use client";
import {useEffect,useRef,useState} from "react";
import CompanyStory from "./CompanyStory";

type Props={name:string;value:string;onChange:(value:string)=>void;maxLength:number;label:string;tone?:string};
function serialize(node:Node):string{
  if(node.nodeType===Node.TEXT_NODE)return node.textContent??"";
  if(!(node instanceof HTMLElement))return "";
  const tag=node.tagName.toLowerCase();
  if(["script","style","iframe","object","svg"].includes(tag))return "";
  const text=Array.from(node.childNodes).map(serialize).join("");
  if(tag==="br")return "\n";
  if(tag==="b"||tag==="strong")return "**"+text+"**";
  if(tag==="i"||tag==="em")return "*"+text+"*";
  if(/^h[1-6]$/.test(tag))return "\n"+"#".repeat(Math.min(Number(tag[1]),3))+" "+text.trim()+"\n";
  if(tag==="li")return "- "+text.trim()+"\n";
  if(tag==="a"){
    const href=node.getAttribute("href")??"";
    if(/^https?:\/\/[^\s)]+$/i.test(href))return "["+text+"]("+href+")";
  }
  if(["p","div","ul","ol","blockquote"].includes(tag))return text+"\n";
  return text;
}
function normalize(value:string){return value.replace(/\r\n?/g,"\n").replace(/\u00a0/g," ").replace(/^\s*[•●▪◦]\s+/gm,"- ").replace(/\n{3,}/g,"\n\n").trim();}
function appendInline(parent:HTMLElement,text:string){
  for(const part of text.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*|\[[^\]\n]+\]\(https?:\/\/[^)\n]+\))/g)){
    const link=part.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/);
    if(link){const a=document.createElement("a");a.textContent=link[1];a.href=link[2];parent.append(a);}
    else if(part.startsWith("**")&&part.endsWith("**")){const b=document.createElement("strong");b.textContent=part.slice(2,-2);parent.append(b);}
    else if(part.startsWith("*")&&part.endsWith("*")){const i=document.createElement("em");i.textContent=part.slice(1,-1);parent.append(i);}
    else parent.append(document.createTextNode(part));
  }
}
function renderText(target:HTMLElement,text:string){
  target.replaceChildren();
  let list:HTMLElement|null=null;
  for(const line of normalize(text).split("\n")){
    const heading=line.match(/^(#{1,3})\s+(.*)$/);
    const bullet=line.match(/^[-*]\s+(.*)$/);
    if(bullet){if(!list){list=document.createElement("ul");target.append(list);}const li=document.createElement("li");appendInline(li,bullet[1]);list.append(li);continue;}
    list=null;
    const el=document.createElement(heading?"h"+heading[1].length:"p");
    if(line)appendInline(el,heading?heading[2]:line);else el.append(document.createElement("br"));
    target.append(el);
  }
}
export default function FormattedTextEditor({name,value,onChange,maxLength,label,tone="navy"}:Props){
  const editor=useRef<HTMLDivElement>(null);
  const last=useRef<string|null>(null);
  const [preview,setPreview]=useState(false);
  const [error,setError]=useState("");
  useEffect(()=>{if(editor.current&&last.current!==value){renderText(editor.current,value);last.current=value;}},[value,preview]);
  function sync(){
    if(!editor.current)return;
    const next=normalize(Array.from(editor.current.childNodes).map(serialize).join(""));
    if(next.length>maxLength){setError("Content exceeds "+maxLength+" characters. The last valid content is retained.");renderText(editor.current,last.current??value);return;}
    setError("");last.current=next;onChange(next);
  }
  function command(cmd:string,arg?:string){editor.current?.focus();document.execCommand(cmd,false,arg);sync();}
  return <div className="vc-formatted-editor">
    <div className="vc-editor-toolbar" aria-label={label+" formatting"}>
      {([["Heading","formatBlock","h2"],["Bold","bold"],["Italic","italic"],["Bullet list","insertUnorderedList"],["Undo","undo"],["Redo","redo"]] as string[][]).map(([title,cmd,arg])=><button key={cmd} type="button" disabled={preview} onMouseDown={e=>e.preventDefault()} onClick={()=>command(cmd,arg)}>{title}</button>)}
      <button type="button" aria-pressed={preview} onClick={()=>{sync();setPreview(p=>!p);}}>{preview?"Edit":"Preview"}</button><span>{value.length}/{maxLength}</span>
    </div>
    <div ref={editor} role="textbox" aria-label={label} aria-multiline="true" contentEditable={!preview} suppressContentEditableWarning hidden={preview} className="vc-formatted-input" onInput={sync} onPaste={e=>{
      e.preventDefault();
      const html=e.clipboardData.getData("text/html");
      const plain=e.clipboardData.getData("text/plain");
      const parsed=html?new DOMParser().parseFromString(html,"text/html"):null;
      const safe=normalize(parsed?Array.from(parsed.body.childNodes).map(serialize).join(""):plain);
      const fragment=document.createElement("div");renderText(fragment,safe);
      document.execCommand("insertHTML",false,fragment.innerHTML);sync();
    }}/>
    {preview&&<div className="vc-company-preview"><CompanyStory text={value} tone={tone}/></div>}
    <textarea name={name} value={value} readOnly hidden aria-hidden="true" tabIndex={-1}/>
    {error&&<p role="alert">{error}</p>}
    <small>Paste formatted content from Word or ChatGPT. Headings, bold, italics and bullets use safe text storage.</small>
  </div>;
}
