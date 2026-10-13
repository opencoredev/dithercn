import { Avatar, AvatarGroup } from "@/components/dithercn/avatar";

const VIEWERS = [
  "Ada Lovelace",
  "Alan Turing",
  "Grace Hopper",
  "Edsger Dijkstra",
  "Barbara Liskov",
  "Ken Thompson",
  "Radia Perlman",
  "Donald Knuth",
  "Frances Allen",
] as const;

export default function AvatarGroupExample() {
  return (
    <div className="bg-background ring-border flex w-full max-w-sm flex-col gap-4 rounded-xl p-5 ring-1">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">Q3 launch plan</span>
          <span className="text-muted-foreground text-xs">
            Edited 4 minutes ago
          </span>
        </div>
        <AvatarGroup max={4} size={28}>
          {VIEWERS.map((name) => (
            <Avatar key={name} name={name} />
          ))}
        </AvatarGroup>
      </div>
      <div className="border-border flex items-center justify-between gap-4 border-t pt-4">
        <span className="text-muted-foreground text-xs">Shared with</span>
        <AvatarGroup max={6} size={22} outline="var(--background)">
          {VIEWERS.map((name) => (
            <Avatar key={name} name={name} fill="solid" />
          ))}
        </AvatarGroup>
      </div>
    </div>
  );
}
