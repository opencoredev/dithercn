import { ImageResponse } from "next/og";

import { OgCard } from "@/components/og-card";
import { SITE } from "@/constants/site";

export const GET = (request: Request) => {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title") || SITE.DESCRIPTION.SHORT;
  const description = searchParams.get("description") ?? undefined;

  return new ImageResponse(<OgCard title={title} description={description} />, {
    height: 630,
    width: 1200,
  });
};
