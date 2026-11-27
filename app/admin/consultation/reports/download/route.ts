import {consultationReport} from "@/lib/consultation/report";
export async function GET(request:Request) {
  const params=new URL(request.url).searchParams;
  const report=await consultationReport(params.get("from")??undefined,params.get("to")??undefined);
  const headers={"Cache-Control":"private, no-store"};
  if(report.status!==200) return new Response("Report unavailable",{status:report.status,headers});
  // All values are database dates, constrained enums or counts.
  const lines=report.rows.map(row=>[row.day,row.mode,row.outcome,row.sessions].join(","));
  return new Response(["Day (PKT),Mode,Outcome,Sessions",...lines].join("\r\n"),{headers:{...headers,"Content-Type":"text/csv; charset=utf-8","Content-Disposition":"attachment; filename=consultation-report.csv"}});
}
