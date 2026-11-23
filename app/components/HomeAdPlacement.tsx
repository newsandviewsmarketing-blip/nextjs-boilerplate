import AdSenseHomeUnit from "./AdSenseHomeUnit";

// Only enable a real ad unit after site approval and publisher-supplied configuration.
// Avoid injecting placeholder identifiers or ad scripts into the public site.
export default function HomeAdPlacement(){
 const client=process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID?.trim()??"";
 const slot=process.env.NEXT_PUBLIC_ADSENSE_HOME_SLOT_ID?.trim()??"";
 const enabled=/^ca-pub-\d{16}$/.test(client)&&/^\d{10}$/.test(slot);
 return <section className="vc-home-ad-placement" aria-label="Advertisement area">
  <div className="shell">
   <div className="vc-home-ad-frame">
    <span className="vc-home-ad-label">Advertisement</span>
    {enabled?<AdSenseHomeUnit client={client} slot={slot}/>:
     <div className="vc-home-ad-placeholder" aria-label="Advertising placement reserved">Advertising space</div>}
   </div>
  </div>
 </section>;
}
