# Palettes and theme

## The tokens

`dither-tokens` adds these CSS variables, with separate values under `:root` (light) and `.dark`:

| Variable                                                                        | Default               | Meaning                                   |
| ------------------------------------------------------------------------------- | --------------------- | ----------------------------------------- |
| `--dither-ink`                                                                  | `var(--primary)`      | The main dot colour, palette name `"ink"` |
| `--dither-paper`                                                                | `var(--background)`   | The colour behind the dots                |
| `--dither-cell`                                                                 | `3px`                 | One cell in CSS pixels                    |
| `--dither-bloom`                                                                | `1` dark, `0.6` light | Bloom strength                            |
| `--dither-color-blue`, `-purple`, `-green`, `-pink`, `-orange`, `-red`, `-grey` | tuned per theme       | The named colours                         |

Tailwind gets `dither-ink`, `dither-paper` and one utility per named colour (`bg-dither-green`, `text-dither-orange`).

## Choosing colours

- Use the names: `palette={["--dither-paper", "blue"]}`, `color="green"`. They are tuned to read on both black and white, so the dither follows light and dark with no extra work.
- Any CSS colour works where a `DitherColor` is accepted: `"--chart-2"`, `"var(--accent)"`, `"oklch(0.72 0.15 272)"`. Prefer variables; literal colours do not change with the theme.
- `"transparent"` as `palette[0]` lets whatever is behind the shader show through the paper cells. Use it when the dither sits on an image, a gradient or a card colour you don't control.
- Inside a card, set paper to the card colour so the dither blends: `palette={["--card", "ink"]}`, or set `--dither-paper: var(--card)` on the card.

## Palettes of more than two colours

The palette runs from tone 0 to tone 1, and each cell dithers between the two neighbouring colours:

```tsx
palette={["--dither-paper", "purple", "blue", "--dither-ink"]}
```

Order the colours by how strongly they stand out against the paper, from weakest to strongest, or the ramp jumps back and forth. Three to five colours is plenty; more blur into noise.

The field's tone snaps to `levels` steps before it is dithered, so a tone meant to be exactly one of the colours can land just beside it and pick up stray dots of its neighbour. Set `levels` so every stop is a step: `levels - 1` a multiple of `colours - 1`. Three colours: `levels={17}` (the bayer4 default already works). Four colours: `levels={13}` or `levels={19}`. Five colours: `levels={17}`.

## Light and dark

The tokens switch on a `.dark` class (shadcn's convention). Theme switches that change the class or style on `<html>` (next-themes and most others) make every shader re-read its colours and redraw. SVG and CSS fills use `var()` and follow instantly.

If the app has no theme switcher, nothing adds `.dark`, so the dark values never apply, even when the operating system is in dark mode. Look for `next-themes` or a `dark` class in the root layout. Without one, ask before adding next-themes (`<ThemeProvider attribute="class" defaultTheme="system" enableSystem>` around the body, `suppressHydrationWarning` on `<html>`); to test dark mode meanwhile, add the class by hand in the browser: `document.documentElement.classList.add("dark")`.

Check both themes. Common fixes:

- Ink too heavy in light mode: lower the peak tone, or use a lighter named colour.
- Glow invisible in light mode: light paper needs a darker ink. `"ink"` and the named colours already flip; literal colours don't.
- A section that is always dark: `className="dark"` on its wrapper.

## Retinting a section

Variables cascade. Set them on a wrapper to retint everything inside:

```tsx
<section style={{ "--dither-ink": "var(--chart-2)" } as React.CSSProperties}>
  …
</section>
```

## Contrast

Ink and paper need a clear difference for the pattern to read. For anything that carries information (charts, meters, status), aim for about 4.5:1 between them. Quiet backgrounds can go lower; text placed over a dither still needs 4.5:1 against the densest dots behind it.
