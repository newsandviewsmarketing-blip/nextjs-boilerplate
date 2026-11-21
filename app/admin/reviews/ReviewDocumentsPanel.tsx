type ReviewDocument = {
  key: string;
  kind: string;
  filename: string;
  status?: string | null;
  url?: string | null;
};

const expectedVetTypes = [
  {label:"PVMC registration", keys:["pvmc","pvmc_card","pvmc_certificate","pvmc_registration"]},
  {label:"Veterinary degree", keys:["degree","dvm","qualification"]},
];

function matching(doc:ReviewDocument, words:string[]) {
  const text=(doc.kind+" "+doc.filename).toLowerCase().replace(/[-_]/g," ");
  return words.some(word=>text.includes(word.replace(/_/g," ")));
}

export default function ReviewDocumentsPanel({
  documents,
  veterinarian=false,
}:{
  documents:ReviewDocument[];
  veterinarian?:boolean;
}) {
  return <div className="review-document-panel">
    <p className="form-help">{documents.length} document(s) linked to this record. Files are private; only authorized reviewers should open these links.</p>
    {veterinarian && <ul className="review-document-checklist">
      {expectedVetTypes.map(item=>{
        const found=documents.some(doc=>matching(doc,item.keys));
        return <li key={item.label}><b>{item.label}:</b> {found?"Attached (verify authenticity)":"Not identified in linked uploads (check before approval)"}</li>;
      })}
    </ul>}
    {documents.length===0?<p className="form-help">No linked uploads were found in the available registration records. This does not prove that no files exist in other private document stores.</p>:
      <ul className="review-document-list">{documents.map(doc=><li key={doc.key}>
        <b>{doc.kind}</b> · {doc.filename} · <span>{doc.status||"Awaiting review"}</span>
        {" · "}{doc.url?<a href={doc.url} target="_blank" rel="noopener noreferrer">View file</a>:"Preview unavailable"}
      </li>)}</ul>}
  </div>;
}
