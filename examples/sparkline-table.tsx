import { Sparkline } from "@/components/dithercn/sparkline";

const PAGES = [
  {
    path: "/pricing",
    trend: [
      320, 341, 338, 362, 390, 377, 412, 431, 428, 466, 481, 503, 512, 534,
    ],
    views: "6,129",
  },
  {
    path: "/docs/installation",
    trend: [
      410, 402, 396, 421, 418, 409, 431, 426, 438, 433, 441, 437, 452, 449,
    ],
    views: "5,963",
  },
  {
    path: "/blog/dithering",
    trend: [80, 96, 141, 388, 512, 446, 371, 302, 265, 231, 214, 198, 187, 176],
    views: "4,107",
  },
  {
    path: "/changelog",
    trend: [
      262, 251, 244, 238, 229, 233, 218, 211, 206, 199, 203, 191, 187, 180,
    ],
    views: "3,052",
  },
] as const;

export default function SparklineTable() {
  return (
    <div className="bg-background border-border w-full max-w-xl overflow-hidden rounded-2xl border [--dither-paper:var(--background)]">
      <table className="w-full text-sm">
        <caption className="text-muted-foreground px-4 pt-4 pb-2 text-left text-sm">
          Top pages, last 14 days
        </caption>
        <thead>
          <tr className="text-muted-foreground border-border border-b text-xs">
            <th scope="col" className="px-4 py-2 text-left font-normal">
              Page
            </th>
            <th scope="col" className="px-4 py-2 text-left font-normal">
              Trend
            </th>
            <th scope="col" className="px-4 py-2 text-right font-normal">
              Views
            </th>
          </tr>
        </thead>
        <tbody>
          {PAGES.map((page) => (
            <tr
              key={page.path}
              className="border-border border-b last:border-0"
            >
              <td className="px-4 py-3 font-mono text-xs">{page.path}</td>
              <td className="w-28 px-4 py-2 sm:w-36">
                <Sparkline
                  data={page.trend}
                  label={`Daily views of ${page.path}`}
                  height={24}
                  dot={false}
                />
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {page.views}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
