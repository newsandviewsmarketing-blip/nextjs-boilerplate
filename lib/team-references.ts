/**
 * Editorially reviewed external references for individual Vet-Connect team members.
 * Link directly to the source about the person, not just a generic organisation homepage.
 * Add links only after checking identity, the destination, and the claim it supports.
 * These are references, not person identity URLs (sameAs).
 */
type TeamReference = {label:string;url:string};

export const verifiedTeamReferences:Record<string,TeamReference[]> = {
  "prof-dr-muhammad-kashif-saleemi":[
    {label:"Official UAF faculty profile",url:"https://web.uaf.edu.pk/FacultyProfile/Profile/396"}
  ],
  "dr-hanif-nazir-chaudhry":[
    {label:"The Veterinary News & Views: editorial board announcement",url:"https://vetnewsandviews.com/en/important-announcement-from-the-veterinary-news-and-views/"}
  ]
};
