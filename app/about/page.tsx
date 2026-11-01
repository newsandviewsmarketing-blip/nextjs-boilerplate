import PublicInformationPage from "@/app/components/PublicInformationPage";
import { publicInformationMetadata } from "@/lib/public-information";

export const metadata = publicInformationMetadata("about");

export default function Page() {
  return <PublicInformationPage slug="about" />;
}
