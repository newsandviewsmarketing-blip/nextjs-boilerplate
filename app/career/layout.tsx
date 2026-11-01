import type {Metadata} from 'next';
import {requireCareerAccount} from '@/lib/career-access';
export const dynamic='force-dynamic';
export const metadata:Metadata={robots:{index:false,follow:false}};
export default async function CareerLayout({children}:{children:React.ReactNode}){
 await requireCareerAccount();
 return children;
}
