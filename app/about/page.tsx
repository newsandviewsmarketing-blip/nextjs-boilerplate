import PublicInformationPage from "@/app/components/PublicInformationPage";
import { siteContentMetadata } from "@/lib/site-content";

export async function generateMetadata() { return siteContentMetadata("about"); }
export default function Page() { return <PublicInformationPage slug="about" />; }
