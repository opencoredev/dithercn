import { Avatar } from "@/components/dithercn/avatar";
import { FILL_VARIANTS } from "@/lib/dither";

const NAMES = ["mira", "otto", "juno", "pax", "sol", "wren"] as const;

export default function AvatarFills() {
  return (
    // Avatars without a size read --avatar-size, so the row shrinks on phones.
    <div className="flex flex-col gap-4 [--avatar-size:30px] sm:[--avatar-size:44px]">
      {FILL_VARIANTS.map((fill) => (
        <div key={fill} className="flex items-center gap-2 sm:gap-3">
          <span className="text-muted-foreground w-14 shrink-0 font-mono text-xs">
            {fill}
          </span>
          {NAMES.map((name) => (
            <Avatar key={name} name={name} fill={fill} shape="square" />
          ))}
        </div>
      ))}
    </div>
  );
}
