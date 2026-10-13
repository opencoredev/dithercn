import { ImageCompare } from "@/components/dithercn/image-compare";

export default function ImageComparePresets() {
  return (
    <ImageCompare
      src="/examples/aldrin.jpg"
      alt="Buzz Aldrin on the Moon, as newsprint on the left and Game Boy greens on the right"
      before={{ kind: "dither", preset: "newsprint" }}
      after={{ kind: "dither", preset: "gameboy" }}
      beforeLabel="Newsprint"
      afterLabel="Game Boy"
      defaultValue={42}
      ratio={4 / 5}
      className="w-full max-w-sm rounded-xl"
    />
  );
}
