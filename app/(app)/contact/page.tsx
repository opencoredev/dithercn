import { TrustPageView } from "@/components/trust-page";
import { ROUTES } from "@/constants/routes";
import { TRUST_PAGES } from "@/lib/trust-pages";
import { createPageMetadata } from "@/seo/metadata";

const page = TRUST_PAGES.contact;

export const dynamic = "force-static";

export const metadata = createPageMetadata({
  description: page.description,
  markdownPath: "/contact.md",
  ogImage: ROUTES.OG,
  path: "/contact",
  title: page.title,
});

export default function Page() {
  return <TrustPageView page={page} />;
}
