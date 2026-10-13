"use client";

import { createContext, useContext, useId } from "react";
import type { KeyboardEvent, ReactNode } from "react";

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
}) => (
  <div
    role="radiogroup"
    aria-labelledby={labelId}
    className="bg-muted/70 flex rounded-lg p-0.5"
  >
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
            "focus-visible:ring-ring/60 h-7 min-w-0 flex-1 truncate rounded-md px-1.5 font-mono text-[11px] transition-[color,background-color] duration-150 ease-out outline-none focus-visible:ring-2",
            checked
              ? "bg-background text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.2)]"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {option}
        </button>
      );
    })}
  </div>
);

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
    className="flex flex-wrap gap-1.5"
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
          className={cn(
            "focus-visible:ring-ring/60 grid size-7 place-items-center rounded-full outline-none transition-[box-shadow] duration-150 ease-out focus-visible:ring-2",
            checked
              ? "ring-foreground/80 ring-1 ring-offset-0"
              : "hover:ring-border hover:ring-1"
          )}
        >
          <span
            className="size-4 rounded-full"
            style={{ background: cssColor(option) }}
          />
        </button>
      );
    })}
  </div>
);

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
      "focus-visible:ring-ring/60 relative h-5 w-9 shrink-0 rounded-full outline-none transition-colors duration-150 ease-out focus-visible:ring-2",
      checked ? "bg-dither-ink" : "bg-muted"
    )}
  >
    <span
      className={cn(
        "bg-foreground absolute top-0.5 left-0.5 size-4 rounded-full transition-transform duration-200 ease-(--ease-out) motion-reduce:transition-none",
        checked && "bg-background translate-x-4"
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
          <input
            type="range"
            aria-labelledby={labelId}
            min={control.min}
            max={control.max}
            step={control.step}
            value={number}
            onChange={(event) => set(event.currentTarget.valueAsNumber)}
            className="accent-dither-ink h-4 w-full cursor-pointer"
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

/**
 * The controls tray under the stage, one or two columns wide. Each
 * change re-renders the demo with the new value; Replay keeps the values.
 */
export const PreviewControlsPanel = ({
  controls,
  values,
  onChange,
  onReset,
}: {
  controls: readonly PreviewControl[];
  values: Values;
  onChange: (id: string, value: PreviewValue) => void;
  onReset: () => void;
}) => {
  const changed = controls.some(
    (control) => readControl(control, values[control.id]) !== control.default
  );
  return (
    <div
      role="group"
      aria-label="Preview controls"
      className="border-border/70 flex flex-col gap-4 border-t px-5 pt-4 pb-5 sm:px-6"
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
      <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
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
