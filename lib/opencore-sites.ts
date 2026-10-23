// Leo's public sites, linked from the footer of each one. Every repo keeps an
// identical copy of this list, so update all of them together. URLs are the
// exact origin each site serves (some redirect apex to www), and the links stay
// plain followed links on purpose.

export interface OpenCoreSite {
  readonly name: string;
  readonly description: string;
  readonly url: string;
}

export const OPENCORE_SITES = [
  {
    description: "TypeScript SDK for social APIs",
    name: "Social SDK",
    url: "https://social-sdk.dev",
  },
  {
    description: "Email for TypeScript apps",
    name: "Email SDK",
    url: "https://email-sdk.dev",
  },
  {
    description: "Custom domains for TypeScript",
    name: "Domain SDK",
    url: "https://www.domain-sdk.dev",
  },
  {
    description: "One SDK for SMS providers",
    name: "SMS SDK",
    url: "https://www.sms-sdk.com",
  },
  {
    description: "One SDK for cloud sandboxes",
    name: "Sandbox SDK",
    url: "https://sandbox-sdk.app",
  },
  {
    description: "ChatGPT sign-in for your app",
    name: "Login with ChatGPT",
    url: "https://loginwithchatgpt.dev",
  },
  {
    description: "Animated gradients for React",
    name: "gradients.sh",
    url: "https://gradients.sh",
  },
  {
    description: "Dither effects for your app",
    name: "dithercn",
    url: "https://dithercn.dev",
  },
  {
    description: "Background removal on your device",
    name: "BG0",
    url: "https://bg0.dev",
  },
  {
    description: "File conversion on your computer",
    name: "convt",
    url: "https://convt.app",
  },
  {
    description: "Close the loop on user requests",
    name: "Amend",
    url: "https://amend.sh",
  },
  {
    description: "Instant links for agent output",
    name: "agentdrop",
    url: "https://www.agent-drop.co",
  },
  {
    description: "Open-source desktop app for Grok bots",
    name: "Akeru Bot",
    url: "https://www.akeru-bot.com",
  },
  {
    description: "The developer behind OpenCore",
    name: "Leo",
    url: "https://leodev.cv",
  },
] as const satisfies readonly OpenCoreSite[];

export type OpenCoreSiteUrl = (typeof OPENCORE_SITES)[number]["url"];

/** Every site except the one rendering the footer. */
export const otherOpenCoreSites = (
  current: OpenCoreSiteUrl
): readonly OpenCoreSite[] =>
  OPENCORE_SITES.filter((site) => site.url !== current);
