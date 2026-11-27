// Pure policy helpers. These do not authorize a call or reserve quota.
export const MAX_ROOM_SECONDS = 600;
export const MAX_PARTICIPANTS = 2;
export function roomPolicy(sessionId: string, now: number, expiry: number, audioOnly: boolean) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId)) throw new Error('Invalid session');
  if (!Number.isSafeInteger(now) || !Number.isSafeInteger(expiry) || expiry <= now || expiry-now > MAX_ROOM_SECONDS) throw new Error('Invalid room expiry');
  return {name:`vc-${sessionId.toLowerCase()}`,privacy:'private',properties:{exp:expiry,eject_at_room_exp:true,max_participants:MAX_PARTICIPANTS,enable_knocking:false,enable_screenshare:false,enable_chat:false,enable_recording:null,start_with_video_off:audioOnly}};
}
export function reservedParticipantMinutes(now:number,expiry:number) {
  if (!Number.isSafeInteger(now)||!Number.isSafeInteger(expiry)||expiry<=now||expiry-now>MAX_ROOM_SECONDS) throw new Error('Invalid reservation');
  return MAX_PARTICIPANTS*Math.ceil((expiry-now)/60);
}
export function canReserve(limit:number,committed:number,reserved:number,requested:number) {
  return [limit,committed,reserved,requested].every(x=>Number.isSafeInteger(x)&&x>=0)&&requested>0&&committed+reserved+requested<=limit;
}
