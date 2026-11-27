// Provider-independent session rules. Not a substitute for transactional database authorization.
export type SessionState = 'requested'|'accepted'|'provisioning'|'ready'|'in_progress'|'completed'|'declined'|'cancelled'|'expired'|'failed';
export type SessionActor = 'requester'|'veterinarian'|'system'|'provider';
export type Session = { requesterId:string; veterinarianId:string; state:SessionState; expiresAt:number };
const transitions: Record<SessionState, Partial<Record<SessionState, readonly SessionActor[]>>> = {
 requested:{accepted:['veterinarian'],declined:['veterinarian'],cancelled:['requester'],expired:['system']},
 accepted:{provisioning:['system'],cancelled:['requester','veterinarian'],expired:['system'],failed:['system']},
 provisioning:{ready:['system'],failed:['system'],expired:['system']},
 ready:{in_progress:['provider'],cancelled:['requester','veterinarian'],expired:['system'],failed:['system']},
 in_progress:{completed:['provider'],failed:['system'],expired:['system']},
 completed:{},declined:{},cancelled:{},expired:{},failed:{}
};
export function canTransition(session:Session,to:SessionState,actor:SessionActor,actorId:string|null,now:number):boolean {
 if(!Number.isSafeInteger(now)||!Number.isSafeInteger(session.expiresAt)||session.requesterId===session.veterinarianId)return false;
 if(actor==='requester'&&actorId!==session.requesterId)return false;
 if(actor==='veterinarian'&&actorId!==session.veterinarianId)return false;
 if((actor==='system'||actor==='provider')&&actorId!==null)return false;
 if(to==='expired'&&now<session.expiresAt)return false;
 if(now>=session.expiresAt&&!['expired','completed','failed'].includes(to))return false;
 return transitions[session.state]?.[to]?.includes(actor)??false;
}
export function canJoin(session:Session, userId:string,now:number,eligible:boolean,enabled:boolean):boolean {
 return enabled&&eligible&&session.requesterId!==session.veterinarianId&&Number.isSafeInteger(now)&&Number.isSafeInteger(session.expiresAt)&&now<session.expiresAt&&['ready','in_progress'].includes(session.state)&&(userId===session.requesterId||userId===session.veterinarianId);
}
