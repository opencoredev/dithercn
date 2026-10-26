import { LINK } from "@/constants/links";
import { ROUTES } from "@/constants/routes";
import { SITE } from "@/constants/site";
import { CONTACT_EMAIL } from "@/lib/trust-pages";

// The author, described the same way everywhere a Person appears.
const PERSON = {
  "@type": "Person",
  description:
    "Leo builds and maintains dithercn, an open-source dither engine and agent skill for shadcn/ui, and other OpenCore developer tools.",
  jobTitle: "Founder & Software Engineer",
  name: SITE.AUTHOR.NAME,
  sameAs: [SITE.AUTHOR.URL, LINK.GITHUB_REPO],
  url: SITE.AUTHOR.URL,
  worksFor: { "@type": "Organization", name: SITE.NAME, url: SITE.URL },
} as const;

const JsonLdScript = ({ data }: { data: Record<string, unknown> }) => (
  <script
    dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    type="application/ld+json"
  />
);

export const WebsiteJsonLd = () => (
  <JsonLdScript
    data={{
      "@context": "https://schema.org",
      "@type": "WebSite",
      description: SITE.DESCRIPTION.LONG,
      inLanguage: "en-US",
      name: SITE.NAME,
      url: SITE.URL,
    }}
  />
);

export const SoftwareSourceCodeJsonLd = () => (
  <JsonLdScript
    data={{
      "@context": "https://schema.org",
      "@type": "SoftwareSourceCode",
      applicationCategory: "DeveloperApplication",
      author: PERSON,
      codeRepository: LINK.GITHUB_REPO,
      description: SITE.DESCRIPTION.LONG,
      isAccessibleForFree: true,
      keywords: SITE.KEYWORDS,
      license: LINK.MIT_LICENSE,
      maintainer: PERSON,
      name: SITE.NAME,
      offers: {
        "@type": "Offer",
        availability: "https://schema.org/InStock",
        price: "0",
        priceCurrency: "USD",
      },
      programmingLanguage: ["TypeScript", "React", "Next.js"],
      runtimePlatform: "Node.js",
      url: SITE.URL,
    }}
  />
);

export const OrganizationJsonLd = () => (
  <JsonLdScript
    data={{
      "@context": "https://schema.org",
      "@type": "Organization",
      address: {
        "@type": "PostalAddress",
        addressCountry: "US",
        addressLocality: "San Francisco",
        addressRegion: "CA",
      },
      contactPoint: {
        "@type": "ContactPoint",
        availableLanguage: ["English"],
        contactType: "customer support",
        email: CONTACT_EMAIL,
        url: `${SITE.URL}/contact`,
      },
      founder: PERSON,
      logo: SITE.OG_IMAGE,
      name: SITE.NAME,
      sameAs: [LINK.GITHUB_REPO, SITE.AUTHOR.URL],
      url: SITE.URL,
    }}
  />
);

export const BreadcrumbJsonLd = ({
  items,
}: {
  items: { name: string; path: string }[];
}) => (
  <JsonLdScript
    data={{
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: items.map((item, index) => ({
        "@type": "ListItem",
        item: `${SITE.URL}${item.path.startsWith(ROUTES.HOME) ? item.path : `${ROUTES.HOME}${item.path}`}`,
        name: item.name,
        position: index + 1,
      })),
    }}
  />
);

export const JsonLdScripts = () => (
  <>
    <WebsiteJsonLd />
    <SoftwareSourceCodeJsonLd />
    <OrganizationJsonLd />
  </>
);
