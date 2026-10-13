import { Avatar } from "@/components/dithercn/avatar";
import { FILL_VARIANTS } from "@/lib/dither";

const NAMES = ["mira", "otto", "juno", "pax", "sol", "wren"] as const;

export default function AvatarFills() {
  return (
    <div className="flex flex-col gap-4">
      {FILL_VARIANTS.map((fill) => (
        <div key={fill} className="flex items-center gap-3">
          <span className="text-muted-foreground w-16 font-mono text-xs">
            {fill}
          </span>
          {NAMES.map((name) => (
            <Avatar
              key={name}
              name={name}
              fill={fill}
              size={44}
              shape="square"
            />
          ))}
        </div>
      ))}
    </div>
  );
}
