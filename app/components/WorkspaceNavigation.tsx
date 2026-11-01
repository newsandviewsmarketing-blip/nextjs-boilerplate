'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {WORKSPACE_LINKS} from '@/lib/professional-workspace';
export default function WorkspaceNavigation({approved=false}:{approved?:boolean}){
 const path=usePathname();
 const pathname=path.startsWith('/dashboard/career/cv')?path.replace('/dashboard/career/cv','/career/cv'):path;
 return <nav className="workspace-tool-navigation" aria-label="My VetConnect workspace"><div className="shell">
 <details className="workspace-tool-menu"><summary>My workspace <span>{WORKSPACE_LINKS.find(link=>pathname===link.href||(link.id==='cv'&&pathname.startsWith('/career/cv/')))?.label??'Choose a task'}</span></summary><div className="workspace-tool-links">
 {WORKSPACE_LINKS.filter(link=>approved||!link.requiresApproval||pathname===link.href).map(link=>{
 const current=pathname===link.href||(link.id==='cv'&&pathname.startsWith('/career/cv/'));
 return <Link key={link.id} href={link.href} aria-current={current?'page':undefined}>{link.label}</Link>;
 })}</div></details></div></nav>;
}
