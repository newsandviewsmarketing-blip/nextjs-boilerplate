import Link from "next/link";
import {redirect} from "next/navigation";
import {consultationReport} from "@/lib/consultation/report";
export default async function Reports({searchParams}:{searchParams:Promise<{from?:string,to?:string}>}) {
 const params=await searchParams;
 const report=await consultationReport(params.from,params.to);
 if(report.status===403) redirect("/dashboard");
 return <main className="section"><div className="shell"><Link href="/admin/consultation">Consultation settings</Link><h1>Consultation activity</h1>
 <form><label>From <input type="date" name="from" defaultValue={report.first??params.from}/></label> <label>Through <input type="date" name="to" defaultValue={report.last??params.to}/></label> <button>Filter</button></form>
 {report.status!==200?<p role="alert">Report unavailable. Select a period of up to 93 days.</p>:<><Link href={`/admin/consultation/reports/download?from=${report.first}&to=${report.last}`}>Download CSV</Link>
 {report.rows.length?<table><caption>Session counts by request date in Pakistan</caption><thead><tr>{["Date","Mode","Outcome","Sessions"].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{report.rows.map(r=><tr key={[r.day,r.mode,r.outcome].join("/")}><td>{r.day}</td><td>{r.mode}</td><td>{r.outcome}</td><td>{r.sessions}</td></tr>)}</tbody></table>:<p>No sessions in this period.</p>}</>}</div></main>;
}
