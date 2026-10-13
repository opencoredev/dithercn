import {
  JetBrains_Mono as FontMono,
  Schibsted_Grotesk as FontSans,
} from "next/font/google";

import { cn } from "@/lib/utils";

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fontMono = FontMono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
});

export const fontVariables = cn(fontSans.variable, fontMono.variable);
