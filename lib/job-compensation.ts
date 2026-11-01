import {parseCareerPreferences} from './career-preferences';
export function jobCompensation(form:FormData){
 const p=parseCareerPreferences(form);
 const country=String(form.get('country')??'Pakistan').trim();
 const work=String(form.get('work_mode')??'On-site');
 if(!country||country.length>100||/[<>\u0000-\u001f]/.test(country))throw new Error('Enter a valid job country.');
 if(!['On-site','Remote','Hybrid'].includes(work))throw new Error('Choose a valid work arrangement.');
 return {country,work_mode:work,salary_min:p.salary_min,salary_max:p.salary_max,salary_currency:p.salary_currency,salary_period:p.salary_period};
}
