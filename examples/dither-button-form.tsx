"use client";

import { useState } from "react";

import { DitherButton } from "@/components/dithercn/dither-button";

export default function DitherButtonForm() {
  const [saving, setSaving] = useState(false);

  return (
    <form
      className="bg-background ring-border flex w-full max-w-sm flex-col gap-5 rounded-xl p-5 ring-1"
      onSubmit={(event) => {
        event.preventDefault();
        setSaving(true);
        window.setTimeout(() => setSaving(false), 1800);
      }}
    >
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">Delete project</span>
        <span className="text-muted-foreground text-sm text-pretty">
          This removes acme-web, its 14 deployments and every preview URL.
        </span>
      </div>
      <div className="flex justify-end gap-2">
        <DitherButton variant="outline" color="grey" size="sm">
          Cancel
        </DitherButton>
        <DitherButton
          type="submit"
          color="red"
          fill="hatched"
          size="sm"
          loading={saving}
        >
          {saving ? "Deleting" : "Delete project"}
        </DitherButton>
      </div>
    </form>
  );
}
