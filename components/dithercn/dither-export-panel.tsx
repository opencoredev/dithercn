"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { ComponentProps, KeyboardEvent, ReactNode } from "react";

import type { DitherMatrix } from "@/lib/dither";
import { download, toCSS, toPNG, toSVG } from "@/lib/dither/export";
import { cn } from "@/lib/utils";

/*
 * Direction: an export sheet from a small design app (Figma's export
 * section, Linear's share popover). One quiet card: format switch on top,
 * a true preview of the file, two or three choices, then the numbers you
 * get and two actions. Mono readouts, ink for the primary action, nothing
 * that reads as a form.
 */

export const EXPORT_FORMATS = ["png", "svg", "css"] as const;

/** A file type the panel can save. */
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

/** What the CSS tab writes: the whole dither, or a repeating tile. */
export type CSSExportKind = "image" | "tile";

/** Reported after every copy or download. */
export interface ExportEvent {
  format: ExportFormat;
  action: "copy" | "download";
  /** Size of what was copied or saved. */
  bytes: number;
  filename: string;
}

export type DitherExportPanelProps = Omit<
  ComponentProps<"div">,
  "children" | "onCopy"
> & {
  /**
   * The dither to export, one pixel per cell, such as `ditherImage`
   * returns. `null` shows the panel disabled.
   */
  image: ImageData | null;
  /** Pixels per cell at 1×. Default 4. */
  cell?: number;
  /** File name without the extension. Default `"dither"`. */
  filename?: string;
  /** Format selected first. Default `"png"`. */
  defaultFormat?: ExportFormat;
  /** Matrix for the CSS tile. Default `"bayer4"`. */
  matrix?: DitherMatrix;
  /** Called after each copy or download. */
  onExport?: (event: ExportEvent) => void;
};

const SCALES = [1, 2, 3, 4] as const;
type Scale = (typeof SCALES)[number];

// The largest canvas side every current browser accepts.
const MAX_SIDE = 16_384;

const FORMAT_LABELS = {
  css: "CSS",
  png: "PNG",
  svg: "SVG",
} as const satisfies Record<ExportFormat, string>;

const FORMAT_NOTES = {
  css: "A rule you paste into your stylesheet. No script, no request.",
  png: "Pixel-exact, every cell a crisp block.",
  svg: "Vector cells. Scales to any size without blur.",
} as const satisfies Record<ExportFormat, string>;

export const formatBytes = (bytes: number) => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  }
  return `${(kb / 1024).toFixed(1)} MB`;
};

// Shrinking a dither with nearest-neighbour sampling makes moiré, so
// previews smooth on the way down and stay sharp on the way up.
const PREVIEW_WIDTH = 360;

const LABEL =
  "text-muted-foreground font-mono text-[10px] tracking-[0.08em] uppercase";

/* ------------------------------------------------------------------ */
/* Small controls                                                      */
/* ------------------------------------------------------------------ */

const onArrowKeys = <T extends string | number>({
  event,
  options,
  value,
  onChange,
}: {
  event: KeyboardEvent<HTMLElement>;
  options: readonly T[];
  value: T;
  onChange: (next: T) => void;
}) => {
  const step = { ArrowDown: 1, ArrowLeft: -1, ArrowRight: 1, ArrowUp: -1 }[
    event.key
  ];
  if (step === undefined) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  const index = options.indexOf(value);
  const next = options.at((index + step) % options.length) ?? value;
  onChange(next);
  event.currentTarget
    .closest("[role=radiogroup]")
    ?.querySelector<HTMLElement>(`[data-value="${String(next)}"]`)
    ?.focus();
};

const Choice = <T extends string | number>({
  label,
  options,
  value,
  onChange,
  render = String,
  disabled,
  className,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (next: T) => void;
  render?: (option: T) => ReactNode;
  disabled?: (option: T) => boolean;
  className?: string;
}) => (
  <div
    role="radiogroup"
    aria-label={label}
    className={cn("bg-muted/70 flex rounded-lg p-0.5", className)}
  >
    {options.map((option) => {
      const checked = option === value;
      return (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={checked}
          data-value={option}
          tabIndex={checked ? 0 : -1}
          disabled={disabled?.(option)}
          onClick={() => onChange(option)}
          onKeyDown={(event) =>
            onArrowKeys({ event, onChange, options, value })
          }
          className={cn(
            "focus-visible:ring-ring/60 h-7 min-w-0 flex-1 truncate rounded-md px-2 font-mono text-[11px] transition-[color,background-color,box-shadow] duration-150 ease-out outline-none focus-visible:ring-2 disabled:opacity-35",
            checked
              ? "bg-background text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.2)]"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {render(option)}
        </button>
      );
    })}
  </div>
);

const ICON = "size-4 shrink-0";

const CheckIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={cn(ICON, className)}
  >
    <path d="m3.5 8.5 3 3 6-7" />
  </svg>
);

const CopyGlyph = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinejoin="round"
    aria-hidden="true"
    className={cn(ICON, className)}
  >
    <rect x="5.25" y="5.25" width="8" height="8" rx="1.75" />
    <path d="M10.75 5.25v-1.5a1.5 1.5 0 0 0-1.5-1.5h-5a1.5 1.5 0 0 0-1.5 1.5v5a1.5 1.5 0 0 0 1.5 1.5h1.5" />
  </svg>
);

const DownloadGlyph = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={cn(ICON, className)}
  >
    <path d="M8 2.5v8m-3.25-3.25L8 10.5l3.25-3.25M3 13.25h10" />
  </svg>
);

/** Two icons stacked; the done tick cross-fades in with a little blur. */
const SwapIcon = ({ done, icon }: { done: boolean; icon: ReactNode }) => (
  <span className="relative grid size-4 place-items-center">
    <span
      className={cn(
        "col-start-1 row-start-1 transition-[opacity,scale,filter] duration-200 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none",
        done ? "scale-25 opacity-0 blur-[4px]" : "scale-100 opacity-100 blur-0"
      )}
    >
      {icon}
    </span>
    <span
      className={cn(
        "col-start-1 row-start-1 transition-[opacity,scale,filter] duration-200 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none",
        done ? "scale-100 opacity-100 blur-0" : "scale-25 opacity-0 blur-[4px]"
      )}
    >
      <CheckIcon />
    </span>
  </span>
);

const ActionButton = ({
  done,
  doneLabel,
  icon,
  label,
  primary,
  disabled,
  onClick,
}: {
  done: boolean;
  doneLabel: string;
  icon: ReactNode;
  label: string;
  primary?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className={cn(
      "focus-visible:ring-ring/60 inline-flex h-9 min-w-0 flex-1 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium transition-[background-color,color,scale,opacity] duration-150 ease-(--ease-out) outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-45 motion-safe:active:scale-[0.96]",
      primary
        ? "bg-dither-ink text-primary-foreground hover:bg-dither-ink/90"
        : "bg-muted text-foreground hover:bg-muted/70"
    )}
  >
    <SwapIcon done={done} icon={icon} />
    <span className="grid">
      {/* Both labels hold the width so the button never jumps. */}
      <span
        aria-hidden={done}
        className={cn(
          "col-start-1 row-start-1 transition-opacity duration-150",
          done && "opacity-0"
        )}
      >
        {label}
      </span>
      <span
        aria-hidden={!done}
        className={cn(
          "col-start-1 row-start-1 transition-opacity duration-150",
          !done && "opacity-0"
        )}
      >
        {doneLabel}
      </span>
    </span>
  </button>
);

/* ------------------------------------------------------------------ */
/* Code view: a tiny highlighter for the CSS and SVG we write          */
/* ------------------------------------------------------------------ */

const TOKEN = {
  attr: "text-dither-blue",
  muted: "text-muted-foreground",
  property: "text-dither-blue",
  selector: "text-dither-pink",
  tag: "text-dither-pink",
  value: "text-dither-orange",
} as const;

type TokenKind = keyof typeof TOKEN;

interface Token {
  text: string;
  kind: TokenKind | "plain";
}

// Data URIs are elided on screen; the copy has them in full.
const DATA_URI = /data:image\/[^"')]+/g;

const elide = (text: string) =>
  text.replaceAll(DATA_URI, (match) => {
    const head = match.slice(0, match.indexOf(",") + 1);
    return `${head}… ${formatBytes(match.length)}`;
  });

const cssLineTokens = (line: string): Token[] => {
  const declaration = /^(\s+)([\w-]+)(:\s*)(.*?)(;?)$/.exec(line);
  if (declaration) {
    const [, indent = "", property = "", colon = "", value = "", semi = ""] =
      declaration;
    return [
      { kind: "plain", text: indent },
      { kind: "property", text: property },
      { kind: "muted", text: colon },
      { kind: "value", text: elide(value) },
      { kind: "muted", text: semi },
    ];
  }
  const selector = /^([^{}]+?)(\s*\{)$/.exec(line);
  if (selector) {
    return [
      { kind: "selector", text: selector[1] ?? "" },
      { kind: "muted", text: selector[2] ?? "" },
    ];
  }
  return [{ kind: "muted", text: line }];
};

const svgLineTokens = (line: string): Token[] => {
  const tokens: Token[] = [];
  const pattern = /(<\/?[\w:]+)|([\w:-]+)(=)("[^"]*")|(\/?>)|(\s+)|([^<>\s]+)/g;
  for (const match of line.matchAll(pattern)) {
    if (match[1]) {
      tokens.push({ kind: "tag", text: match[1] });
    } else if (match[2]) {
      tokens.push(
        { kind: "attr", text: match[2] },
        { kind: "muted", text: match[3] ?? "" },
        { kind: "value", text: match[4] ?? "" }
      );
    } else {
      tokens.push({
        kind: match[5] ? "tag" : "muted",
        text: match[0],
      });
    }
  }
  return tokens;
};

const CodeView = ({
  code,
  language,
  label,
}: {
  code: string;
  language: "css" | "svg";
  label: string;
}) => {
  const lines = code.trimEnd().split("\n");
  const tokenize = language === "css" ? cssLineTokens : svgLineTokens;
  return (
    <pre
      aria-label={label}
      // A scrolling region must take focus so keyboards can scroll it.
      // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
      className="bg-background/60 ring-border/60 focus-visible:ring-ring/60 max-h-44 overflow-auto rounded-xl px-3.5 py-3 font-mono text-[11.5px] leading-[1.7] ring-1 outline-none ring-inset focus-visible:ring-2"
    >
      <code>
        {lines.map((line, row) => (
          // oxlint-disable-next-line react/no-array-index-key -- lines have no identity
          <span key={row} className="block whitespace-pre">
            {tokenize(line).map((token, index) => (
              <span
                // oxlint-disable-next-line react/no-array-index-key -- tokens have no identity
                key={index}
                className={
                  token.kind === "plain" ? undefined : TOKEN[token.kind]
                }
              >
                {token.text}
              </span>
            ))}
          </span>
        ))}
      </code>
    </pre>
  );
};

/* ------------------------------------------------------------------ */
/* Files                                                               */
/* ------------------------------------------------------------------ */

/** Lightest and darkest colours in the image, and how much is ink. */
const tileColors = (image: ImageData) => {
  const { data } = image;
  let darkest = { luma: 2, rgb: "#000000" };
  let lightest = { luma: -1, rgb: "#ffffff" };
  const hex = (offset: number) =>
    `#${[0, 1, 2]
      .map((channel) =>
        (data[offset + channel] ?? 0).toString(16).padStart(2, "0")
      )
      .join("")}`;
  // A sparse sample is plenty to find the end colours.
  const stride = Math.max(1, Math.floor(data.length / 4 / 4096)) * 4;
  for (let offset = 0; offset < data.length; offset += stride) {
    const luma =
      (0.2126 * (data[offset] ?? 0) +
        0.7152 * (data[offset + 1] ?? 0) +
        0.0722 * (data[offset + 2] ?? 0)) /
      255;
    if (luma < darkest.luma) {
      darkest = { luma, rgb: hex(offset) };
    }
    if (luma > lightest.luma) {
      lightest = { luma, rgb: hex(offset) };
    }
  }
  return { darkest: darkest.rgb, lightest: lightest.rgb };
};

/** The class name a file name makes, for the CSS selector. */
const classFor = (filename: string) =>
  filename
    .toLowerCase()
    .replaceAll(/[^a-z0-9-]+/g, "-")
    .replaceAll(/^-+|-+$/g, "") || "dither";

interface CSSSettings {
  kind: CSSExportKind;
  level: number;
  matrix: DitherMatrix;
}

const buildCSS = (
  image: ImageData,
  { kind, level, matrix }: CSSSettings,
  { cell, selector }: { cell: number; selector: string }
) => {
  if (kind === "tile") {
    const { darkest, lightest } = tileColors(image);
    return toCSS({
      cell,
      ink: lightest,
      level,
      matrix,
      paper: darkest,
      selector,
    });
  }
  // Embed whichever format comes out smaller for this picture.
  const png = toCSS({ format: "png", image, kind: "image", selector });
  const svg = toCSS({ format: "svg", image, kind: "image", selector });
  return svg.length < png.length ? svg : png;
};

/** The PNG for the chosen scale, encoded off the click path. */
const usePNG = (image: ImageData | null, factor: number, active: boolean) => {
  const [png, setPNG] = useState<{
    blob: Blob;
    image: ImageData;
    factor: number;
  } | null>(null);

  useEffect(() => {
    if (!image || !active) {
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      const blob = await toPNG(image, { scale: factor });
      if (!cancelled) {
        setPNG({ blob, factor, image });
      }
    }, 120);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [image, factor, active]);

  return png && png.image === image && png.factor === factor ? png.blob : null;
};

/** A blob URL for a string or Blob, revoked when it changes. */
const useObjectUrl = (data: Blob | null) => {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!data) {
      setUrl(null);
      return;
    }
    const next = URL.createObjectURL(data);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [data]);
  return url;
};

/** Sets a flag for a moment after an action succeeds. */
const useFlash = () => {
  const [flash, setFlash] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    },
    []
  );
  const show = (key: string) => {
    if (timer.current) {
      clearTimeout(timer.current);
    }
    setFlash(key);
    timer.current = setTimeout(() => setFlash(null), 1800);
  };
  return [flash, show] as const;
};

/* ------------------------------------------------------------------ */
/* Previews                                                            */
/* ------------------------------------------------------------------ */

const PreviewFrame = ({
  children,
  aspect,
}: {
  children: ReactNode;
  aspect: number;
}) => (
  <div className="bg-background/60 ring-border/60 relative grid min-h-36 place-items-center overflow-hidden rounded-xl p-3 ring-1 ring-inset">
    <div
      className="relative max-h-48 w-full"
      style={{ aspectRatio: aspect, maxWidth: `${12 * aspect}rem` }}
    >
      {children}
    </div>
  </div>
);

const PixelPreview = ({ image }: { image: ImageData }) => {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const element = canvas.current;
    if (!element) {
      return;
    }
    element.width = image.width;
    element.height = image.height;
    element.getContext("2d")?.putImageData(image, 0, 0);
  }, [image]);
  return (
    <canvas
      ref={canvas}
      aria-hidden="true"
      className={cn(
        "absolute inset-0 size-full rounded-[3px] outline-1 -outline-offset-1 outline-white/10",
        image.width <= PREVIEW_WIDTH && "[image-rendering:pixelated]"
      )}
    />
  );
};

const ImagePreview = ({
  src,
  alt,
  width,
}: {
  src: string | null;
  alt: string;
  width: number;
}) =>
  src ? (
    // oxlint-disable-next-line nextjs/no-img-element -- a blob URL of the exported file
    <img
      src={src}
      alt={alt}
      className={cn(
        "absolute inset-0 size-full rounded-[3px] object-contain outline-1 -outline-offset-1 outline-white/10",
        width <= PREVIEW_WIDTH && "[image-rendering:pixelated]"
      )}
    />
  ) : (
    <div className="bg-muted/60 absolute inset-0 animate-pulse rounded-[3px] motion-reduce:animate-none" />
  );

/**
 * The SVG file drawn at its own size, then shrunk smoothly. An `<img>` of
 * the SVG would rasterise at the small size, where cells under a pixel
 * drop out in stripes; this shows the file as it really looks.
 */
const VectorPreview = ({ src, alt }: { src: string | null; alt: string }) => {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [drawn, setDrawn] = useState<string | null>(null);
  useEffect(() => {
    const element = canvas.current;
    if (!src || !element) {
      return;
    }
    let cancelled = false;
    const draw = async () => {
      const picture = new Image();
      picture.src = src;
      try {
        await picture.decode();
      } catch {
        return;
      }
      const fit = Math.min(1, 2048 / Math.max(picture.naturalWidth, 1));
      element.width = Math.round(picture.naturalWidth * fit);
      element.height = Math.round(picture.naturalHeight * fit);
      element
        .getContext("2d")
        ?.drawImage(picture, 0, 0, element.width, element.height);
      if (!cancelled) {
        setDrawn(src);
      }
    };
    draw();
    return () => {
      cancelled = true;
    };
  }, [src]);
  return (
    <>
      <canvas
        ref={canvas}
        role="img"
        aria-label={alt}
        className={cn(
          "absolute inset-0 size-full rounded-[3px] outline-1 -outline-offset-1 outline-white/10 transition-opacity duration-150",
          drawn === src ? "opacity-100" : "opacity-0"
        )}
      />
      {drawn === src ? null : (
        <div className="bg-muted/60 absolute inset-0 animate-pulse rounded-[3px] motion-reduce:animate-none" />
      )}
    </>
  );
};

const CSSPreview = ({ css, scope }: { css: string; scope: string }) => (
  <>
    <style>{css.replace(/^[^{]+\{/, `.${scope} {`)}</style>
    <div
      aria-hidden="true"
      className={cn(
        scope,
        "absolute inset-0 rounded-[3px] outline-1 -outline-offset-1 outline-white/10"
      )}
      // The image rule sets an aspect ratio; the frame decides here.
      style={{ aspectRatio: "auto" }}
    />
  </>
);

/* ------------------------------------------------------------------ */
/* Panel                                                               */
/* ------------------------------------------------------------------ */

const Stat = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="flex min-w-0 flex-col gap-0.5">
    <dt className={LABEL}>{label}</dt>
    <dd className="text-foreground truncate font-mono text-[12px] tabular-nums">
      {value}
    </dd>
  </div>
);

const clipboardSupportsImages = () =>
  typeof ClipboardItem !== "undefined" &&
  typeof navigator.clipboard?.write === "function";

interface Outputs {
  format: ExportFormat;
  scale: Scale;
  css: CSSSettings;
}

/** Everything the panel shows for the current choices. */
const useOutputs = ({
  image,
  cell,
  filename,
  outputs,
}: {
  image: ImageData | null;
  cell: number;
  filename: string;
  outputs: Outputs;
}) => {
  const { format, scale, css } = outputs;
  const factor = cell * scale;
  const png = usePNG(image, factor, format === "png");
  const svg = useMemo(
    () => (image && format === "svg" ? toSVG(image, { cell: factor }) : null),
    [image, format, factor]
  );
  const svgBlob = useMemo(
    () => (svg ? new Blob([svg], { type: "image/svg+xml" }) : null),
    [svg]
  );
  const cssText = useMemo(
    () =>
      image && format === "css"
        ? buildCSS(image, css, { cell, selector: `.${classFor(filename)}` })
        : null,
    [image, format, css, cell, filename]
  );
  return { cssText, factor, png, svg, svgBlob };
};

const fileName = (filename: string, format: ExportFormat, scale: Scale) =>
  `${filename}${format !== "css" && scale > 1 ? `@${scale}x` : ""}.${format}`;

const CSSOptions = ({
  css,
  onChange,
}: {
  css: CSSSettings;
  onChange: (css: Omit<CSSSettings, "matrix">) => void;
}) => (
  <div className="flex flex-col gap-3">
    <div className="flex items-center justify-between gap-3">
      <span className={LABEL}>Write</span>
      <Choice
        label="CSS output"
        options={["image", "tile"] as const}
        value={css.kind}
        onChange={(kind) => onChange({ kind, level: css.level })}
        render={(kind) => (kind === "image" ? "Image" : "Tile")}
        className="w-44"
      />
    </div>
    {css.kind === "tile" ? (
      <label className="flex items-center justify-between gap-3">
        <span className={LABEL}>Coverage</span>
        <span className="flex w-44 items-center gap-2.5">
          <input
            type="range"
            min={0.0625}
            max={0.9375}
            step={0.0625}
            value={css.level}
            onChange={(event) =>
              onChange({
                kind: css.kind,
                level: event.currentTarget.valueAsNumber,
              })
            }
            className="accent-dither-ink h-4 min-w-0 flex-1 cursor-pointer"
          />
          <span className="text-foreground w-9 text-right font-mono text-[11px] tabular-nums">
            {Math.round(css.level * 100)}%
          </span>
        </span>
      </label>
    ) : null}
  </div>
);

interface FileOutput {
  format: ExportFormat;
  name: string;
  png: Blob | null;
  text: string | null;
}

/** Copy and download for the current file, with feedback. */
const useFileActions = ({
  file,
  onExport,
}: {
  file: FileOutput;
  onExport: ((event: ExportEvent) => void) | undefined;
}) => {
  const [flash, showFlash] = useFlash();
  const [status, setStatus] = useState("");
  const { format, name, png, text } = file;

  const report = (action: ExportEvent["action"], bytes: number) => {
    showFlash(action);
    const verb = action === "copy" ? "Copied" : "Saved";
    setStatus(`${verb} ${name}, ${formatBytes(bytes)}.`);
    onExport?.({ action, bytes, filename: name, format });
  };

  const copy = async () => {
    try {
      if (format === "png" && png) {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": png }),
        ]);
        report("copy", png.size);
      } else if (text) {
        await navigator.clipboard.writeText(text);
        report("copy", text.length);
      }
    } catch {
      setStatus("The clipboard is not available here. Download instead.");
    }
  };

  const save = () => {
    if (format === "png" && png) {
      download({ data: png, filename: name });
      report("download", png.size);
    } else if (text) {
      const type = format === "svg" ? "image/svg+xml" : "text/css";
      download({ data: text, filename: name, type });
      report("download", text.length);
    }
  };

  return { copy, flash, save, status };
};

const FilePreview = ({
  format,
  image,
  factor,
  name,
  pngUrl,
  svgUrl,
  cssText,
  scope,
}: {
  format: ExportFormat;
  image: ImageData | null;
  factor: number;
  name: string;
  pngUrl: string | null;
  svgUrl: string | null;
  cssText: string | null;
  scope: string;
}) => {
  const aspect = image ? image.width / image.height : 16 / 9;
  const alt = `Preview of ${name}`;
  const width = (image?.width ?? 0) * factor;
  let content: ReactNode = null;
  if (format === "png" && pngUrl) {
    content = <ImagePreview src={pngUrl} alt={alt} width={width} />;
  } else if (format === "png" && image) {
    content = <PixelPreview image={image} />;
  } else if (format === "svg") {
    content = <VectorPreview src={svgUrl} alt={alt} />;
  } else if (format === "css" && cssText) {
    content = <CSSPreview css={cssText} scope={scope} />;
  }
  return <PreviewFrame aspect={aspect}>{content}</PreviewFrame>;
};

const sizeLabel = ({
  format,
  css,
  cell,
  width,
  height,
}: {
  format: ExportFormat;
  css: CSSSettings;
  cell: number;
  width: number;
  height: number;
}) => {
  if (format !== "css") {
    return `${width} × ${height}`;
  }
  return css.kind === "tile" ? `${cell}px cells` : "covers";
};

const FileStats = ({
  name,
  label,
  size,
  bytes,
}: {
  name: string;
  label: string;
  size: string;
  bytes: number | undefined;
}) => (
  <dl className="border-border/60 grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.8fr)] gap-3 border-t pt-3.5">
    <Stat label="File" value={name} />
    <Stat label={label} value={size} />
    <Stat
      label="Weight"
      value={
        bytes === undefined ? (
          <span className="text-muted-foreground">measuring…</span>
        ) : (
          formatBytes(bytes)
        )
      }
    />
  </dl>
);

/** Name, contents and weight of the file the current choices make. */
const fileFacts = ({
  format,
  scale,
  filename,
  image,
  png,
  svg,
  cssText,
}: {
  format: ExportFormat;
  scale: Scale;
  filename: string;
  image: ImageData | null;
  png: Blob | null;
  svg: string | null;
  cssText: string | null;
}) => {
  const text = format === "svg" ? svg : cssText;
  const bytes = format === "png" ? png?.size : text?.length;
  return {
    bytes,
    canCopy: format !== "png" || clipboardSupportsImages(),
    longest: image ? Math.max(image.width, image.height) : 0,
    name: fileName(filename, format, scale),
    ready: image !== null && bytes !== undefined,
    text,
  };
};

/**
 * Export a dither as PNG, SVG or CSS: pick the format and size, see the
 * file you will get and its weight, then copy or download it.
 */
export const DitherExportPanel = ({
  image,
  cell = 4,
  filename = "dither",
  defaultFormat = "png",
  matrix = "bayer4",
  onExport,
  className,
  ...props
}: DitherExportPanelProps) => {
  const scope = `dcn-export-${useId().replaceAll(/[^a-zA-Z0-9]/g, "")}`;
  const [format, setFormat] = useState<ExportFormat>(defaultFormat);
  const [scale, setScale] = useState<Scale>(1);
  const [cssChoice, setCSSChoice] = useState<Omit<CSSSettings, "matrix">>({
    kind: "image",
    level: 0.5,
  });
  const css = useMemo(() => ({ ...cssChoice, matrix }), [cssChoice, matrix]);
  const { cssText, factor, png, svg, svgBlob } = useOutputs({
    cell,
    filename,
    image,
    outputs: { css, format, scale },
  });
  const pngUrl = useObjectUrl(png);
  const svgUrl = useObjectUrl(svgBlob);
  const { bytes, canCopy, longest, name, ready, text } = fileFacts({
    cssText,
    filename,
    format,
    image,
    png,
    scale,
    svg,
  });
  const { copy, flash, save, status } = useFileActions({
    file: { format, name, png, text },
    onExport,
  });

  return (
    <div
      className={cn("flex w-full min-w-0 flex-col gap-4", className)}
      {...props}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-foreground font-mono text-[11px] tracking-[0.08em] uppercase">
          Export
        </span>
        <Choice
          label="Format"
          options={EXPORT_FORMATS}
          value={format}
          onChange={setFormat}
          render={(option) => FORMAT_LABELS[option]}
          className="w-44"
        />
      </div>

      <FilePreview
        format={format}
        image={image}
        factor={factor}
        name={name}
        pngUrl={pngUrl}
        svgUrl={svgUrl}
        cssText={cssText}
        scope={scope}
      />

      <p className="text-muted-foreground -mt-1 text-[12.5px] leading-snug text-pretty">
        {FORMAT_NOTES[format]}
      </p>

      {format === "css" ? (
        <CSSOptions css={css} onChange={setCSSChoice} />
      ) : (
        <div className="flex items-center justify-between gap-3">
          <span className={LABEL}>Size</span>
          <Choice
            label="Size"
            options={SCALES}
            value={scale}
            onChange={setScale}
            render={(option) => `${option}×`}
            disabled={(option) => longest * cell * option > MAX_SIDE}
            className="w-44"
          />
        </div>
      )}

      {format === "css" && cssText ? (
        <CodeView code={cssText} language="css" label="CSS to copy" />
      ) : null}

      <FileStats
        name={name}
        label={format === "css" ? "Fill" : "Pixels"}
        size={sizeLabel({
          cell,
          css,
          format,
          height: (image?.height ?? 0) * factor,
          width: (image?.width ?? 0) * factor,
        })}
        bytes={bytes}
      />

      <div className="flex gap-2">
        <ActionButton
          label="Copy"
          doneLabel="Copied"
          icon={<CopyGlyph />}
          done={flash === "copy"}
          disabled={!ready || !canCopy}
          onClick={copy}
        />
        <ActionButton
          primary
          label="Download"
          doneLabel="Saved"
          icon={<DownloadGlyph />}
          done={flash === "download"}
          disabled={!ready}
          onClick={save}
        />
      </div>
      <p role="status" className="sr-only">
        {status}
      </p>
    </div>
  );
};
