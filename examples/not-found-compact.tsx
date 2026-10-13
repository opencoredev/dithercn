import { NotFound } from "@/components/dithercn/not-found";
import { Button } from "@/components/ui/button";

export default function NotFoundCompact() {
  return (
    <div className="bg-background w-full max-w-md rounded-2xl border">
      <NotFound
        titleAs="h2"
        animate={false}
        cell={2}
        color="--foreground"
        title="Project not found"
        description="It may have been deleted, or you may not have access."
        actions={<Button size="sm">See all projects</Button>}
        className="py-10 [&>div:first-of-type]:text-[6rem]"
      />
    </div>
  );
}
