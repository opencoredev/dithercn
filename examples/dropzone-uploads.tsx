"use client";

import { useEffect, useState } from "react";

import { Dropzone, DropzoneFileList } from "@/components/dithercn/dropzone";
import type { DropzoneFileItem } from "@/components/dithercn/dropzone";

const STARTER: readonly DropzoneFileItem[] = [
  {
    id: "brand-guide",
    name: "brand-guide.pdf",
    size: 3_870_000,
    status: "done",
  },
  {
    id: "launch-reel",
    name: "launch-reel.mp4",
    progress: 38,
    size: 41_200_000,
    status: "uploading",
  },
];

// Simulated upload speed: a share of the file per tick, bigger files move slower.
const TICK_MS = 260;
const stepFor = (size: number) =>
  Math.max(2, Math.round(9 - Math.log10(size / 1e5) * 2));

export default function DropzoneUploads() {
  const [files, setFiles] = useState<readonly DropzoneFileItem[]>(STARTER);
  const uploading = files.some((file) => file.status === "uploading");

  useEffect(() => {
    if (!uploading) {
      return;
    }
    const timer = window.setInterval(() => {
      setFiles((now) =>
        now.map((file): DropzoneFileItem => {
          if (file.status !== "uploading" || file.progress === null) {
            return file;
          }
          const progress = file.progress + stepFor(file.size);
          return progress >= 100
            ? { id: file.id, name: file.name, size: file.size, status: "done" }
            : { ...file, progress };
        })
      );
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, [uploading]);

  return (
    <div className="bg-background ring-border flex w-full max-w-lg flex-col gap-5 rounded-xl p-5 ring-1">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-sm font-medium">Campaign assets</span>
        <span className="text-muted-foreground font-mono text-xs tabular-nums">
          {files.filter((file) => file.status === "done").length} of{" "}
          {files.length} uploaded
        </span>
      </div>
      <Dropzone
        color="blue"
        maxSize={50 * 1024 * 1024}
        maxFiles={8}
        title="Drop assets to upload"
        className="min-h-56"
        onFilesChange={({ accepted, rejected }) =>
          setFiles((now) => [
            ...accepted.map(
              (file): DropzoneFileItem => ({
                id: crypto.randomUUID(),
                name: file.name,
                progress: 0,
                size: file.size,
                status: "uploading",
              })
            ),
            ...rejected.map(
              ({ file, message }): DropzoneFileItem => ({
                id: crypto.randomUUID(),
                message,
                name: file.name,
                size: file.size,
                status: "error",
              })
            ),
            ...now,
          ])
        }
      />
      <DropzoneFileList
        files={files}
        color="blue"
        onRemove={(id) =>
          setFiles((now) => now.filter((file) => file.id !== id))
        }
      />
    </div>
  );
}
