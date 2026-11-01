'use client';
import {useState} from 'react';
import {CAREER_SKILL_SUGGESTIONS} from '@/lib/career-options';

/** Posts to the existing professional_profiles.skills array action. */
export default function ProfessionalSkillsEdit({initial}:{initial:readonly string[]}){
 const [skills,setSkills]=useState(initial.join(', '));
 const [suggestion,setSuggestion]=useState('');
 const add=()=>{
  if(!suggestion)return;
  const entries=skills.split(',').map(s=>s.trim()).filter(Boolean);
  if(entries.some(x=>x.toLowerCase()===suggestion.toLowerCase()))return setSuggestion('');
  const next=[...entries,suggestion].join(', ');
  if(next.length<=2000)setSkills(next);
  setSuggestion('');
 };
 return <div className="professional-skills-edit">
  <label htmlFor="skills">Skills & expertise</label>
  <input id="skills" name="skills" value={skills} onChange={e=>setSkills(e.target.value)} maxLength={2000} placeholder="Biosecurity, Vaccination, Poultry Health"/>
  <div className="professional-skills-pick">
   <select aria-label="Choose suggested skill" value={suggestion} onChange={e=>setSuggestion(e.target.value)}>
    <option value="">Add a suggested skill</option>
    {CAREER_SKILL_SUGGESTIONS.map(s=><option key={s} value={s}>{s}</option>)}
   </select>
   <button type="button" className="button button-secondary" disabled={!suggestion} onClick={add}>Add</button>
  </div>
  <p className="form-help">Select suggestions or write your own genuine skills, separated by commas. These profile details are saved separately from your private CV.</p>
 </div>;
}
