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

Order the colours by how strongly they stand out against the paper, from weakest to strongest, or the ramp jumps back and forth. A ramp is for colours that build in strength, like a glow from deep blue to white. A ramp of unrelated hues reads as noise, because neighbouring tones take unrelated colours. For many hues side by side, use the next section.

The field's tone snaps to `levels` steps before it is dithered, so a tone meant to be exactly one of the colours can land just beside it and pick up stray dots of its neighbour. Set `levels` so every stop is a step: `levels - 1` a multiple of `colours - 1`. Three colours: `levels={17}` (the bayer4 default already works). Four colours: `levels={13}` or `levels={19}`. Five colours: `levels={17}`.

## Any number of hues

The field returns one tone, and the palette maps that tone to a colour, so in a palette of several hues the tone sets both the dot density and the colour. It can't draw a red line and a blue line at the same strength, or a spectrum that runs left to right. When the user asks for a rainbow, a spectrum, an RGB effect or a different colour per line or shape, keep shape and colour apart:

- The field draws only the shape, in tone 0 to 1, the same as any other field.
- The colour is a layer under the shader: a CSS gradient, several gradients, SVG, or a canvas.
- The palette is `["--background", "transparent"]`: tone 0 paints the page background, tone 1 lets the layer show through, and the tones between dither the layer's colour into the background.

```tsx
<div className="relative isolate overflow-hidden">
  <div
    aria-hidden
    className="absolute inset-0"
    style={{
      background:
        "linear-gradient(to bottom, red, orange, yellow, green, blue, violet)",
    }}
  />
  <DitherShader
    field={FIELD}
    palette={["--background", "transparent"]}
    className="absolute inset-0"
  />
</div>
```

Pick the layer to match the request:

- Hue across the box (a beam, a bar, a spectrum): `linear-gradient(to right, …)`.
- One hue per line, with the lines stacked: `linear-gradient(to bottom, …)` with a stop at each line's height.
- A ring or arc whose colour runs around it (a lens, a gauge): `conic-gradient(from 0deg at <centre>, …)` with its centre on the ring's centre.
- Different shapes in different colours: one gradient per shape, each positioned over its own shape. A single gradient under everything gives every shape the colour at its height, so a ring or a beam that sits at one height comes out in one hue.

When a scene has several shapes, give each its own colour layer, in the same coordinates as the field. The field still draws every shape in one shader; only the colour is split:

```tsx
// Shapes in the field: wavy lines on the left, a ring centred at (62%, 45%) from the top left, a beam to its right.
<div className="relative isolate overflow-hidden bg-black">
  {/* Lines: one hue per line, stacked top to bottom. */}
  <div
    aria-hidden
    className="absolute inset-y-0 left-0 w-[55%]"
    style={{
      background:
        "linear-gradient(to bottom, red, orange, yellow, lime, cyan, blue, violet)",
    }}
  />
  {/* Ring: hue runs around it. Centre the conic gradient on the ring's centre. */}
  <div
    aria-hidden
    className="absolute inset-0"
    style={{
      background:
        "conic-gradient(from 0deg at 62% 45%, red, yellow, lime, cyan, blue, magenta, red)",
      clipPath: "circle(16% at 62% 45%)",
    }}
  />
  {/* Beam: hue across its thickness, so the rainbow reads along its length. */}
  <div
    aria-hidden
    className="absolute right-0 left-[70%] top-[43%] h-[4%]"
    style={{
      background:
        "linear-gradient(to bottom, red, yellow, lime, cyan, blue, violet)",
    }}
  />
  <DitherShader field={FIELD} palette={PALETTE} className="absolute inset-0" />
</div>
```

Where no layer sits, nothing shows through, so a shape needs a layer under all of it, glow included: make each region a little larger than its shape. Keep the region numbers and the field's numbers in one place (shared constants passed as uniforms) so they can't drift apart.

A palette kept in a constant needs `as const`, because `palette` takes a tuple of at least two colours: `const PALETTE = ["#000", "transparent"] as const;`. Inline arrays work as they are.

- Colour that moves: animate `background-position` on an oversized gradient, with `motion-reduce:animate-none`.

One shader per colour, each with `["transparent", colour]`, also works but costs a WebGL context per colour, and at most 8 run at once. Use one shader over a colour layer.

A complete component is in [recipes.md](recipes.md#many-hues-a-spectrum-of-lines). Literal colours don't follow the theme: check light mode, where yellow and cyan that glow on black wash out on white, and darken those stops or move the colours into CSS variables with light and dark values.

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
