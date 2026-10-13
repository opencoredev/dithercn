import { DitherText } from "@/components/dithercn/dither-text";

export default function DitherTextDemo() {
  return (
    <DitherText
      as="h2"
      className="px-6 text-center text-5xl leading-[0.92] font-semibold tracking-[-0.055em] sm:text-7xl"
    >
      Signal
      <br />
      through noise
    </DitherText>
  );
}
