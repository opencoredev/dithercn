import type { Metadata } from "next";
import Script from "next/script";

import { Analytics } from "@/components/analytics";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { META_THEME_COLORS } from "@/constants/site";
import { fontVariables } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { JsonLdScripts } from "@/seo/json-ld";

import "@/styles/globals.css";
import { baseMetadata } from "@/seo/metadata";

export const metadata: Metadata = baseMetadata;

const RootLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => (
  <html lang="en" suppressHydrationWarning>
    <head>
      <JsonLdScripts />
      <meta name="theme-color" content={META_THEME_COLORS.dark} />
      <Script
        id="theme-color"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `
              try {
                if (localStorage.theme === 'light' || (localStorage.theme === 'system' && !window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.querySelector('meta[name="theme-color"]').setAttribute('content', '${META_THEME_COLORS.light}')
                }
              } catch (_) {}
            `,
        }}
      />
    </head>
    <body
      className={cn(
        "text-foreground group/body overscroll-none font-sans antialiased [font-feature-settings:'ss01','cv11'] [--footer-height:--spacing(14)] [--header-height:--spacing(14)] xl:[--footer-height:--spacing(24)]",
        fontVariables
      )}
    >
      <ThemeProvider>
        {children}
        <Toaster position="top-center" />
        <Analytics />
      </ThemeProvider>
    </body>
  </html>
);

export default RootLayout;
