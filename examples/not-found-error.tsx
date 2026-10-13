import { NotFound } from "@/components/dithercn/not-found";
import { Button } from "@/components/ui/button";

export default function NotFoundError() {
  return (
    <NotFound
      code="500"
      titleAs="h2"
      color="--destructive"
      cell={3}
      title="Something went wrong"
      description="We could not load this page. Try again in a moment."
      actions={<Button variant="outline">Try again</Button>}
    />
  );
}
