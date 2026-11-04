"use client";

import { useState } from "react";

import { Dropzone, DropzoneFileList } from "@/components/dithercn/dropzone";
import type { DropzoneFileItem } from "@/components/dithercn/dropzone";
import { usePreviewValue } from "@/components/preview-controls";
import * as knobs from "@/examples/dropzone-controls";

export default function DropzoneDemo() {
  const state = usePreviewValue(knobs.state);
  const color = usePreviewValue(knobs.tint);
  const matrix = usePreviewValue(knobs.matrix);
  const bloom = usePreviewValue(knobs.bloom);
  const cell = usePreviewValue(knobs.cell);
  const disabled = usePreviewValue(knobs.disabled);
  const [files, setFiles] = useState<readonly DropzoneFileItem[]>([]);

  return (
    <div className="flex w-full max-w-lg flex-col gap-5">
      <Dropzone
        accept="image/*,application/pdf"
        maxSize={10 * 1024 * 1024}
        maxFiles={5}
        color={color}
        matrix={matrix}
        bloom={bloom}
        cell={cell}
        disabled={disabled}
        forceState={state === "live" ? undefined : state}
        onFilesChange={({ accepted, rejected }) => {
          const added = [
            ...accepted.map(
              (file): DropzoneFileItem => ({
                id: crypto.randomUUID(),
                name: file.name,
                size: file.size,
                status: "done",
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
          ];
          setFiles((now) => [...added, ...now].slice(0, 4));
        }}
      />
      {files.length > 0 ? (
        <DropzoneFileList
          files={files}
          color={color}
          onRemove={(id) =>
            setFiles((now) => now.filter((file) => file.id !== id))
          }
        />
      ) : null}
    </div>
  );
}
