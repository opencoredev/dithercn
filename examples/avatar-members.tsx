import { Avatar } from "@/components/dithercn/avatar";
import type { AvatarStatus } from "@/components/dithercn/avatar";

const MEMBERS: readonly {
  name: string;
  email: string;
  role: string;
  status: AvatarStatus;
}[] = [
  {
    email: "ada@acme.dev",
    name: "Ada Lovelace",
    role: "Owner",
    status: "online",
  },
  {
    email: "alan@acme.dev",
    name: "Alan Turing",
    role: "Admin",
    status: "busy",
  },
  {
    email: "grace@acme.dev",
    name: "Grace Hopper",
    role: "Member",
    status: "away",
  },
  { email: "deploy-bot", name: "deploy-bot", role: "Bot", status: "offline" },
];

export default function AvatarMembers() {
  return (
    <ul className="bg-background ring-border divide-border flex w-full max-w-md flex-col divide-y rounded-xl ring-1">
      {MEMBERS.map((member, index) => (
        <li key={member.email} className="flex items-center gap-3 px-4 py-3">
          <Avatar
            name={member.email}
            label={member.name}
            size={36}
            status={member.status}
            fill={member.role === "Bot" ? "hatched" : "gradient"}
            color={member.role === "Bot" ? "grey" : undefined}
            ring={index === 0}
          />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-medium">{member.name}</span>
            <span className="text-muted-foreground truncate font-mono text-xs">
              {member.email}
            </span>
          </div>
          <span className="text-muted-foreground text-xs">{member.role}</span>
        </li>
      ))}
    </ul>
  );
}
