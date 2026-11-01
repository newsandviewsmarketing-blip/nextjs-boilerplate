export default function JobCompensationFields(){
 return <fieldset className="form-span-2"><legend>Work arrangement and salary</legend><div className="form-grid">
 <div><label htmlFor="job-country">Country</label><input id="job-country" name="country" maxLength={100} defaultValue="Pakistan" required/></div>
 <div><label htmlFor="job-work-mode">Work arrangement</label><select id="job-work-mode" name="work_mode"><option>On-site</option><option>Remote</option><option>Hybrid</option></select></div>
 <div><label htmlFor="job-currency">Salary currency</label><input id="job-currency" name="salary_currency" maxLength={3} pattern="[A-Za-z]{3}" defaultValue="PKR" required/></div>
 <div><label htmlFor="job-pay-period">Pay period</label><select id="job-pay-period" name="salary_period"><option value="month">Monthly</option><option value="year">Annual</option><option value="hour">Hourly</option></select></div>
 {['min','max'].map(bound=><div key={bound}><label htmlFor={'job-salary-'+bound}>Salary {bound==='min'?'minimum':'maximum'} (optional)</label><input id={'job-salary-'+bound} name={'salary_'+bound} type="number" min={0} max={9999999999} step="0.01"/></div>)}
 </div><p>Leave salary blank if undisclosed. Publish the actual employer range, currency and pay period.</p></fieldset>;
}
