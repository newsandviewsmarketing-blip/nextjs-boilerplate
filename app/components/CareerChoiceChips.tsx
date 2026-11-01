'use client';

import {useId,useMemo,useState,type KeyboardEvent} from 'react';

/** A focused multi-choice input using JSON arrays (legacy comma lists remain supported). */
export default function CareerChoiceChips({
  name,label,initial=[],options=[],placeholder='Type to search',
  help,allowCustom=false,showSuggestionsInitially=false,
}:{
  name:string;label:string;initial?:readonly string[];options?:readonly string[];
  placeholder?:string;help?:string;allowCustom?:boolean;showSuggestionsInitially?:boolean;
}){
  const id=useId();
  const [chosen,setChosen]=useState<string[]>(()=>[...new Set(initial.map(s=>s.trim()).filter(Boolean))]);
  const [query,setQuery]=useState('');
  const [notice,setNotice]=useState('');
  const suggestions=useMemo(()=>{
    const q=query.trim().toLocaleLowerCase();
    if(!q&&!showSuggestionsInitially)return [];
    return options.filter(option=>
      (!q||option.toLocaleLowerCase().includes(q)) &&
      !chosen.some(item=>item.toLocaleLowerCase()===option.toLocaleLowerCase())
    ).slice(0,7);
  },[options,chosen,query,showSuggestionsInitially]);

  function add(text:string){
    const item=text.trim();
    if(!item)return;
    if(item.length>90||/[\n\r<>]/.test(item)){
      setNotice('Choose one entry at a time, up to 90 characters.');return;
    }
    if(!allowCustom&&!options.some(option=>option.toLocaleLowerCase()===item.toLocaleLowerCase())){
      setNotice('Choose an approved option from the suggestions.');return;
    }
    if(chosen.some(value=>value.toLocaleLowerCase()===item.toLocaleLowerCase())){
      setQuery('');setNotice('Already selected.');return;
    }
    if(chosen.length>=20){setNotice('Choose up to 20 items.');return;}
    const canonical=options.find(option=>option.toLocaleLowerCase()===item.toLocaleLowerCase())??item;
    setChosen(items=>[...items,canonical]);setQuery('');setNotice('');
  }
  function keyDown(event:KeyboardEvent<HTMLInputElement>){
    if(event.key!=='Enter')return;
    event.preventDefault();
    const exact=options.find(option=>option.toLocaleLowerCase()===query.trim().toLocaleLowerCase());
    if(exact||allowCustom)add(exact??query);
    else if(suggestions.length===1)add(suggestions[0]);
    else setNotice('Select an option below to add it.');
  }
  return <div className="career-choice-field">
    <label htmlFor={id}>{label}</label>
    <input type="hidden" name={name} value={JSON.stringify(chosen)}/>
    {chosen.length>0&&<ul className="career-choice-tags" aria-label={'Selected '+label}>
      {chosen.map(value=><li key={value}><span>{value}</span><button type="button" aria-label={'Remove '+value} onClick={()=>{setChosen(items=>items.filter(item=>item!==value));setNotice('');}}>×</button></li>)}
    </ul>}
    <div className="career-choice-entry">
      <input id={id} value={query} onChange={e=>{setQuery(e.target.value);setNotice('');}} onKeyDown={keyDown} placeholder={placeholder} maxLength={90} autoComplete="off"/>
      <button className="button button-secondary" type="button" disabled={!query.trim()||chosen.length>=20} onClick={()=>add(query)}>Add</button>
    </div>
    {suggestions.length>0&&<div className="career-choice-suggestions" aria-label={'Suggestions for '+label}>
      {suggestions.map(value=><button key={value} type="button" onClick={()=>add(value)}>{value}<span aria-hidden="true">+</span></button>)}
    </div>}
    {help&&<p className="form-help">{help}</p>}
    {notice&&<p className="form-help" role="status">{notice}</p>}
  </div>;
}
