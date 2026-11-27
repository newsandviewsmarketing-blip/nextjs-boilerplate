import type {Metadata} from "next";
import Link from "next/link";
import {getCurrentIdentity} from "@/lib/auth";
import {getEffectiveAdminPermission} from "@/lib/admin";
import {signOutAction,switchAccountAction} from "@/app/auth/actions";
import WorkspaceClock from "@/app/components/WorkspaceClock";
import "@/app/components/workspace-shared.css";
import "./review-summary.css";
export const metadata:Metadata={robots:{index:false,follow:false}};
export default async function PrivateWorkspaceLayout({children}:{children:React.ReactNode}){
 const identity=await getCurrentIdentity();
 const allowed=identity&&await getEffectiveAdminPermission(identity,"admin.view");
 return <>{allowed&&identity&&<header className="vc-shared-admin-header"><Link href="/admin" className="vc-shared-brand">VetConnect Admin</Link><WorkspaceClock/><details className="vc-shared-account"><summary>My account</summary><div><strong>{identity.profile?.full_name||"Account"}</strong><span>{identity.email||"Email unavailable"}</span><small>{identity.roles.map(role=>role.replaceAll("_"," ")).join(" · ")}</small><Link href="/dashboard">My workspace</Link><Link href="/">Visit VetConnect</Link><form action={switchAccountAction}><button type="submit">Switch account</button></form><form action={signOutAction}><button type="submit">Sign out</button></form></div></details></header>}{children}</>;
}
