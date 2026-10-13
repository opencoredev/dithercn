import { DotMap } from "@/components/dithercn/dot-map";
import { CUSTOMERS } from "@/examples/dot-map-data";

const STATS = [
  { label: "Countries", value: "64" },
  { label: "Teams", value: "12,400" },
  { label: "Uptime", value: "99.99%" },
];

export default function DotMapCustomers() {
  return (
    <section className="flex w-full flex-col items-center gap-8 px-4 py-10 text-center sm:px-8">
      <div className="flex max-w-md flex-col items-center gap-3">
        <span className="text-muted-foreground font-mono text-xs tracking-wide uppercase">
          Customers
        </span>
        <h3 className="text-2xl font-medium tracking-[-0.03em] text-balance sm:text-3xl">
          Shipping from 64 countries, every timezone covered
        </h3>
      </div>
      <DotMap
        markers={CUSTOMERS}
        accent="green"
        shape="round"
        columns={140}
        halo={10}
        title="Customer cities"
        className="max-w-2xl"
      />
      <dl className="grid w-full max-w-md grid-cols-3 gap-4">
        {STATS.map((stat) => (
          <div key={stat.label} className="flex flex-col gap-1">
            <dt className="text-muted-foreground text-xs">{stat.label}</dt>
            <dd className="text-lg font-medium tabular-nums">{stat.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
