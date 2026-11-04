"use client";

import { DitherButton } from "@/components/dithercn/dither-button";
import {
  DitherTabs,
  DitherTabsContent,
  DitherTabsList,
  DitherTabsTrigger,
} from "@/components/dithercn/dither-tabs";

const PLANS = [
  {
    blurb: "For side projects and small teams.",
    monthly: 15,
    name: "Team",
    yearly: 12,
  },
  {
    blurb: "Audit logs, SSO and priority support.",
    monthly: 40,
    name: "Business",
    yearly: 32,
  },
] as const;

const BILLING = [
  { key: "monthly", note: "billed monthly" },
  { key: "yearly", note: "per month, billed yearly" },
] as const;

export default function DitherTabsPricing() {
  return (
    <DitherTabs
      defaultValue="yearly"
      color="green"
      className="w-full max-w-lg items-center gap-6"
    >
      <DitherTabsList aria-label="Billing period">
        <DitherTabsTrigger value="monthly">Monthly</DitherTabsTrigger>
        <DitherTabsTrigger value="yearly">
          Yearly
          <span className="text-xs font-normal opacity-75">−20%</span>
        </DitherTabsTrigger>
      </DitherTabsList>
      {BILLING.map((billing) => (
        <DitherTabsContent
          key={billing.key}
          value={billing.key}
          className="grid w-full gap-3 sm:grid-cols-2"
        >
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className="bg-background flex flex-col gap-4 rounded-xl border p-5"
            >
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">{plan.name}</span>
                <span className="text-muted-foreground text-sm">
                  {plan.blurb}
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-semibold tracking-tight tabular-nums">
                  ${plan[billing.key]}
                </span>
                <span className="text-muted-foreground text-xs">
                  {billing.note}
                </span>
              </div>
              <DitherButton
                color="green"
                variant={plan.name === "Business" ? "filled" : "outline"}
                size="sm"
              >
                Start a trial
              </DitherButton>
            </div>
          ))}
        </DitherTabsContent>
      ))}
    </DitherTabs>
  );
}
