/** Add section metadata here, then supply its typed panel in the profile page. */
export const PROFILE_SECTIONS = [
 {id:'photo',label:'Photo & identity',hint:'Your professional introduction'},
 {id:'about',label:'About & skills',hint:'Headline, summary and visibility'},
 {id:'experience',label:'Experience',hint:'Work history and responsibilities'},
 {id:'education',label:'Education',hint:'Degrees and academic training'},
 {id:'credentials',label:'Credentials',hint:'Licences and certificates'},
 {id:'documents',label:'Documents',hint:'CV files and supporting documents'},
] as const;
export type ProfileSectionId=typeof PROFILE_SECTIONS[number]['id'];
/** Each tool has one canonical destination. Aliases must not be added as duplicate tabs. */
export const WORKSPACE_LINKS=[
 {id:'overview',label:'Overview',href:'/career',requiresApproval:false},
 {id:'profile',label:'Professional profile',href:'/dashboard/professional',requiresApproval:true},
 {id:'cv',label:'CV Builder',href:'/career/cv',requiresApproval:false},
 {id:'letter',label:'Cover letter',href:'/career/cover-letter',requiresApproval:false},
 {id:'preferences',label:'Job interests',href:'/career/preferences',requiresApproval:false},
 {id:'connections',label:'Organization connections',href:'/career/connections',requiresApproval:false},
 {id:'applications',label:'Applications',href:'/dashboard/career',requiresApproval:true},
] as const;
