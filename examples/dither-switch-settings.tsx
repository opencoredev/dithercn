"use client";

import { useId, useState } from "react";

import { DitherButton } from "@/components/dithercn/dither-button";
import { DitherSwitch } from "@/components/dithercn/dither-switch";

const SETTINGS = [
  {
    defaultChecked: true,
    description: "Failed builds and expiring domains.",
    disabled: true,
    label: "Security alerts",
    name: "security",
  },
  {
    defaultChecked: true,
    description: "When a deployment you started goes live.",
    disabled: false,
    label: "Deployments",
    name: "deployments",
  },
  {
    defaultChecked: false,
    description: "Mentions and replies on preview links.",
    disabled: false,
    label: "Comments",
    name: "comments",
  },
  {
    defaultChecked: false,
    description: "One email every Monday with last week's usage.",
    disabled: false,
    label: "Weekly digest",
    name: "digest",
  },
] as const;

export default function DitherSwitchSettings() {
  const id = useId();
  const [saved, setSaved] = useState<string | null>(null);

  return (
    <form
      className="bg-background ring-border flex w-full max-w-md flex-col rounded-xl ring-1"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const on = SETTINGS.filter((setting) => data.has(setting.name));
        setSaved(on.map((setting) => setting.label).join(", ") || "nothing");
      }}
    >
      <div className="flex flex-col gap-1 border-b px-5 py-4">
        <span className="font-medium">Email notifications</span>
        <span className="text-muted-foreground text-sm">
          Choose what lands in your inbox.
        </span>
      </div>
      <ul className="flex flex-col">
        {SETTINGS.map((setting) => (
          <li
            key={setting.name}
            className="flex items-center justify-between gap-6 border-b px-5 py-3.5"
          >
            <div className="flex min-w-0 flex-col gap-0.5">
              <label
                htmlFor={`${id}-${setting.name}`}
                className="text-sm font-medium"
              >
                {setting.label}
              </label>
              <span
                id={`${id}-${setting.name}-description`}
                className="text-muted-foreground text-sm text-pretty"
              >
                {setting.description}
              </span>
            </div>
            <DitherSwitch
              id={`${id}-${setting.name}`}
              aria-describedby={`${id}-${setting.name}-description`}
              name={setting.name}
              defaultChecked={setting.defaultChecked}
              disabled={setting.disabled}
              color="green"
            />
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between gap-4 px-5 py-4">
        <span
          aria-live="polite"
          className="text-muted-foreground min-w-0 truncate text-sm"
        >
          {saved === null ? null : `Saved: ${saved}`}
        </span>
        <DitherButton type="submit" size="sm" color="green">
          Save
        </DitherButton>
      </div>
    </form>
  );
}
