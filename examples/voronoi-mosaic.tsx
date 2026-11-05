import { Voronoi } from "@/components/dithercn/voronoi";

export default function VoronoiMosaic() {
  return (
    <Voronoi
      variant="stone"
      scale={1.6}
      wall={2}
      drift={0.6}
      colors={["blue", "purple", "green", "pink"]}
      className="absolute inset-0"
    />
  );
}
