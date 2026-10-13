import { notFound } from "next/navigation";
import { ImageResponse } from "next/og";

import { OgCard } from "@/components/og-card";
import { getPageImage, source } from "@/lib/source";

export const revalidate = false;

export const GET = async (
  _req: Request,
  { params }: RouteContext<"/og/docs/[...slug]">
) => {
  const { slug } = await params;
  const page = source.getPage(slug.slice(0, -1));
  if (!page) {
    notFound();
  }

  const { title, description } = page.data;

  return new ImageResponse(<OgCard title={title} description={description} />, {
    height: 630,
    width: 1200,
  });
};

export const generateStaticParams = () =>
  source.getPages().map((page) => ({
    lang: page.locale,
    slug: getPageImage(page).segments,
  }));
