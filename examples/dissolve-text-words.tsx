import { DissolveText } from "@/components/dithercn/dissolve-text";

export default function DissolveTextWords() {
  return (
    <div className="flex max-w-md flex-col gap-4 px-6">
      <DissolveText
        as="h3"
        by="word"
        matrix="bayer8"
        cell={2}
        accent="green"
        className="text-2xl font-semibold tracking-[-0.03em]"
      >
        Quarterly report
      </DissolveText>
      <DissolveText
        as="p"
        by="word"
        matrix="bayer8"
        cell={2}
        delay={200}
        stagger={45}
        className="text-muted-foreground text-base text-pretty"
      >
        Revenue grew in every region this quarter. Most of it came from teams
        that moved their dashboards to live data in the spring.
      </DissolveText>
    </div>
  );
}
