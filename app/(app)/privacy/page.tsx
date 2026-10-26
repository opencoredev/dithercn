import { TrustPageView } from "@/components/trust-page";
import { ROUTES } from "@/constants/routes";
import { TRUST_PAGES } from "@/lib/trust-pages";
import { createPageMetadata } from "@/seo/metadata";

const page = TRUST_PAGES.privacy;

export const dynamic = "force-static";

export const metadata = createPageMetadata({
  description: page.description,
  markdownPath: "/privacy.md",
  ogImage: ROUTES.OG,
  path: "/privacy",
  title: page.title,
});

export default function Page() {
  return <TrustPageView page={page} />;
}
