"use client";

import { useEffect, useState } from "react";

import { Avatar } from "@/components/dithercn/avatar";
import { DitherButton } from "@/components/dithercn/dither-button";
import { Dropzone, formatBytes } from "@/components/dithercn/dropzone";

interface Photo {
  url: string;
  name: string;
  size: number;
}

export default function DropzoneAvatar() {
  const [photo, setPhoto] = useState<Photo | null>(null);

  // Release the preview URL when the photo changes or the page goes.
  useEffect(
    () => () => {
      if (photo) {
        URL.revokeObjectURL(photo.url);
      }
    },
    [photo]
  );

  return (
    <div className="bg-background ring-border flex w-full max-w-md flex-col gap-4 rounded-xl p-5 ring-1">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-sm font-medium whitespace-nowrap">
          Profile photo
        </span>
        <span className="text-muted-foreground font-mono text-xs whitespace-nowrap">
          256px or larger
        </span>
      </div>
      <Dropzone
        color="purple"
        accept="image/png,image/jpeg,image/webp"
        maxSize={2 * 1024 * 1024}
        multiple={false}
        title={photo ? photo.name : "Drop a photo here"}
        description={
          photo
            ? `${formatBytes(photo.size)} · Drop another to replace it`
            : undefined
        }
        browseLabel={photo ? "Choose another" : "Choose a photo"}
        className="min-h-56"
        preview={
          photo ? (
            // A local object URL, so there is nothing for next/image to optimise.
            // oxlint-disable-next-line nextjs/no-img-element
            <img
              src={photo.url}
              alt=""
              className="ring-dither-purple ring-offset-background size-20 rounded-full object-cover ring-2 ring-offset-2"
            />
          ) : (
            <Avatar name="Ada Lovelace" size={80} color="purple" ring />
          )
        }
        onFilesChange={({ accepted }) => {
          const [file] = accepted;
          if (file) {
            setPhoto({
              name: file.name,
              size: file.size,
              url: URL.createObjectURL(file),
            });
          }
        }}
      />
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground text-xs text-pretty">
          Shown on your profile and next to your comments.
        </span>
        <DitherButton
          variant="outline"
          color="grey"
          size="sm"
          disabled={photo === null}
          onClick={() => setPhoto(null)}
        >
          Remove
        </DitherButton>
      </div>
    </div>
  );
}
