/**
 * The knobs schema for docs previews: plain, serialisable objects, so a
 * schema can be imported by an MDX page (a Server Component) and handed
 * to the client preview frame as a prop. Demos read the live values with
 * `usePreviewValue` from `@/components/preview-controls`.
 *
 * ```ts
 * // examples/area-chart-controls.ts
 * export const areaChartControls = {
 *   fill: segmented({ id: "fill", label: "Fill", options: FILL_VARIANTS, default: "gradient" }),
 *   cell: slider({ id: "cell", label: "Cell", min: 2, max: 6, step: 1, default: 3, unit: "px" }),
 * };
 * ```
 */

/** Pick one of a few short options, shown as a segmented control. */
export interface SegmentedControl<O extends string = string> {
  kind: "segmented";
  id: string;
  label: string;
  options: readonly O[];
  default: O;
}

/** Pick one of many options, shown as a native select. */
export interface SelectControl<O extends string = string> {
  kind: "select";
  id: string;
  label: string;
  options: readonly O[];
  default: O;
}

/** Pick a colour from swatches. Options are palette names or CSS colours. */
export interface ColorControl<O extends string = string> {
  kind: "color";
  id: string;
  label: string;
  options: readonly O[];
  default: O;
}

/** A number on a range. */
export interface SliderControl {
  kind: "slider";
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
  /** Shown after the value, as in `3px`. */
  unit?: string;
}

/** On or off. */
export interface ToggleControl {
  kind: "toggle";
  id: string;
  label: string;
  default: boolean;
}

export type OptionsControl<O extends string = string> =
  | SegmentedControl<O>
  | SelectControl<O>
  | ColorControl<O>;

export type PreviewControl = OptionsControl | SliderControl | ToggleControl;

/** Controls by key, in display order. */
export type PreviewControlSet = Readonly<Record<string, PreviewControl>>;

/** A control's current value as stored by the frame. */
export type PreviewValue = string | number | boolean;

type WithoutKind<C> = Omit<C, "kind">;

/** Options infer the union; the default must be one of them. */
interface OptionsInput<O extends string> {
  id: string;
  label: string;
  options: readonly O[];
  default: NoInfer<O>;
}

export const segmented = <const O extends string>(
  control: OptionsInput<O>
): SegmentedControl<O> => ({ kind: "segmented", ...control });

export const select = <const O extends string>(
  control: OptionsInput<O>
): SelectControl<O> => ({ kind: "select", ...control });

export const color = <const O extends string>(
  control: OptionsInput<O>
): ColorControl<O> => ({ kind: "color", ...control });

export const slider = (control: WithoutKind<SliderControl>): SliderControl => ({
  kind: "slider",
  ...control,
});

export const toggle = (control: WithoutKind<ToggleControl>): ToggleControl => ({
  kind: "toggle",
  ...control,
});

/**
 * Parse a stored value against its control, falling back to the default
 * when it is missing or no longer valid (an option that was removed).
 */
export function readControl<O extends string>(
  control: OptionsControl<O>,
  raw: PreviewValue | undefined
): O;
export function readControl(
  control: SliderControl,
  raw: PreviewValue | undefined
): number;
export function readControl(
  control: ToggleControl,
  raw: PreviewValue | undefined
): boolean;
export function readControl(
  control: PreviewControl,
  raw: PreviewValue | undefined
): PreviewValue;
export function readControl(
  control: PreviewControl,
  raw: PreviewValue | undefined
): PreviewValue {
  switch (control.kind) {
    case "segmented":
    case "select":
    case "color": {
      return (
        control.options.find((option) => option === raw) ?? control.default
      );
    }
    case "slider": {
      return typeof raw === "number" && raw >= control.min && raw <= control.max
        ? raw
        : control.default;
    }
    case "toggle": {
      return typeof raw === "boolean" ? raw : control.default;
    }
    default: {
      const exhaustive: never = control;
      return exhaustive;
    }
  }
}
