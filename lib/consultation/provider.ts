import "server-only";

import {createPrivateTestRoom,mintTestToken,deleteTestRoom,readDailyUsage} from "./daily-rooms";

export type ConnectionResult = { ok: boolean; message: string };
export interface ConsultationProvider {
  readonly id: string;
  readUsage(session:string):Promise<{seconds:number,minutes:number,endedAt:string}|null>;
  createRoom(session:string,expiry:number,audioOnly:boolean):Promise<{name:string,url:string}>;
  issueToken(session:string,user:string,expiry:number,audioOnly:boolean):Promise<string>;
  removeRoom(session:string):Promise<void>;
  testConnection(): Promise<ConnectionResult>;
}


export function getConsultationProvider(id: string): ConsultationProvider | null {
  if (id !== "daily") return null;
  return {
    id: "daily", readUsage:readDailyUsage, createRoom:createPrivateTestRoom, issueToken:mintTestToken, removeRoom:deleteTestRoom,
    async testConnection() {
      const key = process.env.DAILY_API_KEY;
      const domain = process.env.DAILY_DOMAIN?.trim();
      if (!key || !domain || !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.daily\.co$/i.test(domain)) {
        return { ok: false, message: "Daily configuration is missing or invalid." };
      }
      try {
        const result = await fetch("https://api.daily.co/v1/rooms?limit=1", {
          headers: { Authorization: `Bearer ${key}` }, cache: "no-store",
          redirect: "error", signal: AbortSignal.timeout(8000),
        });
        if (!result.ok) return { ok: false, message: "Daily authentication or connectivity failed." };
        return { ok: true, message: "Daily REST authentication succeeded. Domain ownership, rooms and calling are not verified." };
      } catch {
        return { ok: false, message: "Daily connection could not be verified." };
      }
    },
  };
}
