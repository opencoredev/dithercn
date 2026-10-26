"use client";

import { Slider as SliderPrimitive } from "radix-ui";
import { createContext, useContext, useId } from "react";
import type { CSSProperties, KeyboardEvent, ReactNode } from "react";

import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { cssColor } from "@/lib/dither";
import { readControl } from "@/lib/preview-controls";
import type {
  ColorControl,
  OptionsControl,
  PreviewControl,
  PreviewValue,
  SegmentedControl,
  SliderControl,
  ToggleControl,
} from "@/lib/preview-controls";
import { cn } from "@/lib/utils";

/*
 * Direction: a quiet inspector tray, after Figma's properties panel and
 * Linear's settings rows. Mono uppercase labels, one control per row,
 * the selected state in the ink colour, nothing louder than the demo.
 */

type Values = Readonly<Record<string, PreviewValue>>;

const ValuesContext = createContext<Values | null>(null);

/** Supplies knob values to the demo below it. The preview frame renders it. */
export const PreviewControlsProvider = ({
  values,
  children,
}: {
  values: Values;
  children: ReactNode;
}) => <ValuesContext value={values}>{children}</ValuesContext>;

/**
 * The live value of a knob, typed by its control. Outside a preview frame
 * (the demo rendered anywhere else) it is the control's default.
 *
 * ```tsx
 * const fill = usePreviewValue(areaChartControls.fill); // "gradient" | "dotted" | ...
 * ```
 */
export function usePreviewValue<O extends string>(
  control: OptionsControl<O>
): O;
export function usePreviewValue(control: SliderControl): number;
export function usePreviewValue(control: ToggleControl): boolean;
export function usePreviewValue(control: PreviewControl): PreviewValue {
  const values = useContext(ValuesContext);
  return readControl(control, values?.[control.id]);
}

const LABEL =
  "text-muted-foreground font-mono text-[10px] tracking-[0.08em] uppercase";

/** Arrow keys move the selection in a radio group, wrapping at the ends. */
const onRadioKeys = (
  event: KeyboardEvent<HTMLElement>,
  options: readonly string[],
  current: string,
  choose: (value: string) => void
) => {
  const step = {
    ArrowDown: 1,
    ArrowLeft: -1,
    ArrowRight: 1,
    ArrowUp: -1,
  }[event.key];
  if (step === undefined) {
    return;
  }
  event.preventDefault();
  const index = options.indexOf(current);
  const next = options.at((index + step) % options.length) ?? current;
  choose(next);
  const group = event.currentTarget.closest("[role=radiogroup]");
  group
    ?.querySelector<HTMLElement>(`[data-value="${CSS.escape(next)}"]`)
    ?.focus();
};

const Segmented = ({
  control,
  value,
  onChange,
  labelId,
}: {
  control: SegmentedControl;
  value: string;
  onChange: (value: string) => void;
  labelId: string;
}) => {
  const count = control.options.length;
  const index = Math.max(control.options.indexOf(value), 0);
  return (
    <div
      role="radiogroup"
      aria-labelledby={labelId}
      className="bg-muted/70 relative flex rounded-full p-0.5"
    >
      {/* One chip slides under the options; segments are equal widths. */}
      <span
        aria-hidden
        className="bg-background absolute inset-y-0.5 start-0.5 w-(--chip) translate-x-[calc(var(--index)*100%)] rounded-full shadow-[0_1px_2px_rgb(0_0_0/0.08)] transition-transform duration-200 ease-(--ease-out) motion-reduce:transition-none rtl:-translate-x-[calc(var(--index)*100%)] dark:bg-white/[0.11] dark:shadow-none"
        style={
          {
            "--chip": `calc((100% - 0.25rem) / ${count})`,
            "--index": index,
          } as CSSProperties
        }
      />
      {control.options.map((option) => {
        const checked = option === value;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={checked}
            data-value={option}
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(option)}
            onKeyDown={(event) =>
              onRadioKeys(event, control.options, value, onChange)
            }
            className={cn(
              "focus-visible:ring-ring/50 relative h-7 min-w-0 flex-1 truncate rounded-full px-2 pb-[0.5px] font-mono text-[11px] transition-colors duration-150 ease-out outline-none focus-visible:ring-[3px]",
              checked
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
};

const Swatches = ({
  control,
  value,
  onChange,
  labelId,
}: {
  control: ColorControl;
  value: string;
  onChange: (value: string) => void;
  labelId: string;
}) => (
  <div
    role="radiogroup"
    aria-labelledby={labelId}
    className="-mx-1 flex flex-wrap gap-0.5"
  >
    {control.options.map((option) => {
      const checked = option === value;
      return (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={checked}
          aria-label={option}
          title={option}
          data-value={option}
          tabIndex={checked ? 0 : -1}
          onClick={() => onChange(option)}
          onKeyDown={(event) =>
            onRadioKeys(event, control.options, value, onChange)
          }
          className="group/swatch focus-visible:ring-ring/50 relative size-7 rounded-full outline-none focus-visible:ring-[3px]"
        >
          {/* Ring and dot share one box, so they stay concentric. The ring
              takes the swatch's own colour. */}
          <span
            aria-hidden
            className={cn(
              "absolute inset-px rounded-full border-[1.5px] transition-colors duration-150 ease-out",
              checked
                ? "border-current"
                : "group-hover/swatch:border-current/35 border-transparent"
            )}
            style={{ color: cssColor(option) }}
          />
          <span
            aria-hidden
            className="absolute inset-[5px] rounded-full transition-[scale] duration-150 ease-out group-active/swatch:scale-[0.96] motion-reduce:transition-none"
            style={{ background: cssColor(option) }}
          />
        </button>
      );
    })}
  </div>
);

/**
 * A slider whose fill and thumb glide between values instead of jumping,
 * so stepped knobs (curtains 3 to 4) move as smoothly as fine ones.
 */
const Knob = ({
  control,
  value,
  onChange,
  labelId,
}: {
  control: SliderControl;
  value: number;
  onChange: (value: number) => void;
  labelId: string;
}) => {
  const collapsed = control.max <= control.min;
  return (
    <SliderPrimitive.Root
      min={control.min}
      // A collapsed range (min === max) would position the thumb at NaN.
      max={collapsed ? control.min + 1 : control.max}
      disabled={collapsed}
      step={control.step}
      value={[value]}
      onValueChange={([next]) => {
        if (next !== undefined) {
          onChange(next);
        }
      }}
      // Radix focuses the thumb from script on drag, which Chrome treats as
      // keyboard focus. Hide the ring after a pointer and restore it on a key.
      onPointerDown={(event) => {
        event.currentTarget.dataset.pointer = "";
      }}
      onKeyDown={(event) => {
        delete event.currentTarget.dataset.pointer;
      }}
      onBlur={(event) => {
        delete event.currentTarget.dataset.pointer;
      }}
      className="group/knob knob-glide relative flex h-4 w-full cursor-pointer touch-none items-center select-none data-disabled:cursor-default data-disabled:opacity-50"
    >
      <SliderPrimitive.Track className="bg-foreground/12 relative h-1 grow overflow-hidden rounded-full">
        <SliderPrimitive.Range className="bg-dither-ink absolute h-full rounded-full transition-[left,right] duration-150 ease-(--ease-out) motion-reduce:transition-none" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        aria-labelledby={labelId}
        className="focus-visible:ring-ring/50 block size-3.5 rounded-full bg-white shadow-[0_0_0_0.5px_rgb(0_0_0/0.12),0_1px_3px_rgb(0_0_0/0.3)] transition-[scale,box-shadow] duration-150 ease-out outline-none group-hover/knob:scale-115 focus-visible:ring-[3px] active:scale-115 motion-reduce:transition-none group-data-pointer/knob:ring-0!"
      />
    </SliderPrimitive.Root>
  );
};

const Switch = ({
  checked,
  onChange,
  labelId,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  labelId: string;
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-labelledby={labelId}
    onClick={() => onChange(!checked)}
    className={cn(
      "focus-visible:ring-ring/50 relative h-5 w-9 shrink-0 rounded-full outline-none transition-colors duration-150 ease-out focus-visible:ring-[3px]",
      checked ? "bg-dither-ink" : "bg-foreground/15"
    )}
  >
    <span
      className={cn(
        "absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-[0_1px_2px_rgb(0_0_0/0.25)] transition-transform duration-200 ease-(--ease-out) motion-reduce:transition-none",
        checked && "translate-x-4"
      )}
    />
  </button>
);

const ControlRow = ({
  control,
  raw,
  onChange,
}: {
  control: PreviewControl;
  raw: PreviewValue | undefined;
  onChange: (id: string, value: PreviewValue) => void;
}) => {
  const labelId = useId();
  const set = (value: PreviewValue) => onChange(control.id, value);
  const value = readControl(control, raw);

  const label = (
    <span id={labelId} className={LABEL}>
      {control.label}
    </span>
  );

  switch (control.kind) {
    case "toggle": {
      return (
        <div className="flex items-center justify-between gap-3">
          {label}
          <Switch
            checked={readControl(control, raw)}
            onChange={set}
            labelId={labelId}
          />
        </div>
      );
    }
    case "slider": {
      const number = readControl(control, raw);
      return (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            {label}
            <span className="text-foreground font-mono text-[11px] tabular-nums">
              {number}
              {control.unit ?? ""}
            </span>
          </div>
          <Knob
            control={control}
            value={number}
            onChange={set}
            labelId={labelId}
          />
        </div>
      );
    }
    case "segmented": {
      return (
        <div className="flex flex-col gap-2">
          {label}
          <Segmented
            control={control}
            value={String(value)}
            onChange={set}
            labelId={labelId}
          />
        </div>
      );
    }
    case "color": {
      return (
        <div className="flex flex-col gap-2">
          {label}
          <Swatches
            control={control}
            value={String(value)}
            onChange={set}
            labelId={labelId}
          />
        </div>
      );
    }
    case "select": {
      return (
        <div className="flex flex-col gap-2">
          {label}
          <NativeSelect
            size="sm"
            aria-labelledby={labelId}
            value={String(value)}
            onChange={(event) => set(event.currentTarget.value)}
            className="font-mono text-[11px]"
          >
            {control.options.map((option) => (
              <NativeSelectOption key={option} value={option}>
                {option}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      );
    }
    default: {
      const exhaustive: never = control;
      return exhaustive;
    }
  }
};

/** `tray` sits under the stage; `sidebar` is one column beside it. */
export type PreviewControlsLayout = "tray" | "sidebar";

const LAYOUT_CLASS = {
  sidebar: {
    grid: "grid-cols-1 lg:grid-cols-1",
    root: "border-t lg:border-t-0",
  },
  tray: { grid: "grid-cols-1 sm:grid-cols-2", root: "border-t" },
} as const satisfies Record<
  PreviewControlsLayout,
  { grid: string; root: string }
>;

/**
 * The controls tray under the stage, one or two columns wide, or a single
 * column beside a full-screen stage. Each change re-renders the demo with
 * the new value; Replay keeps the values.
 */
export const PreviewControlsPanel = ({
  controls,
  values,
  onChange,
  onReset,
  layout = "tray",
}: {
  controls: readonly PreviewControl[];
  values: Values;
  onChange: (id: string, value: PreviewValue) => void;
  onReset: () => void;
  layout?: PreviewControlsLayout;
}) => {
  const changed = controls.some(
    (control) => readControl(control, values[control.id]) !== control.default
  );
  return (
    <div
      role="group"
      aria-label="Preview controls"
      className={cn(
        "border-border/70 flex flex-col gap-4 px-5 pt-4 pb-5 sm:px-6",
        LAYOUT_CLASS[layout].root
      )}
    >
      <div className="flex h-5 items-center justify-between">
        <span className="text-foreground font-mono text-[11px] tracking-[0.08em] uppercase">
          Controls
        </span>
        <button
          type="button"
          onClick={onReset}
          disabled={!changed}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/60 rounded-sm font-mono text-[11px] transition-[color,opacity] duration-150 outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-0"
        >
          Reset
        </button>
      </div>
      <div className={cn("grid gap-x-6 gap-y-4", LAYOUT_CLASS[layout].grid)}>
        {controls.map((control) => (
          <ControlRow
            key={control.id}
            control={control}
            raw={values[control.id]}
            onChange={onChange}
          />
        ))}
      </div>
    </div>
  );
};
