import { CopyButton } from "@/components/copy-button";
import { InstallCommand, ManualSteps } from "@/components/install-block-client";
import { formatCode } from "@/lib/format-code";
import { highlightCode } from "@/lib/highlight-code";
import { readOptionalFromRoot } from "@/lib/registry";
import {
  getRegistryItem,
  registryItemUrl,
  resolveRegistryUrl,
} from "@/lib/registry-items";

const DITHER_CORE = "{{REGISTRY_URL}}/dither-core.json";

const Step = ({
  index,
  title,
  children,
}: {
  index: number;
  title: React.ReactNode;
  children?: React.ReactNode;
}) => (
  <li className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-3 gap-y-3">
    <span className="bg-muted text-muted-foreground flex size-6 items-center justify-center rounded-full font-mono text-xs tabular-nums">
      {index}
    </span>
    <p className="text-foreground/85 [&_code]:bg-muted pt-0.5 text-sm leading-relaxed [&_code]:rounded-md [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.8rem]">
      {title}
    </p>
    {children ? <div className="col-start-2 min-w-0">{children}</div> : null}
  </li>
);

const SourceFile = async ({
  path,
  target,
}: {
  path: string;
  target: string;
}) => {
  const raw = await readOptionalFromRoot(path);
  if (raw === null) {
    throw new Error(`InstallBlock: missing source file "${path}"`);
  }
  const code = await formatCode(raw);
  const html = await highlightCode(code, path.split(".").pop() ?? "tsx");
  return (
    <figure
      data-rehype-pretty-code-figure=""
      className="mx-0! mt-0! rounded-[14px]! [&_pre]:max-h-80 [&_pre]:overflow-auto"
    >
      <figcaption data-rehype-pretty-code-title="">{target}</figcaption>
      <CopyButton
        value={code}
        event="component_code_copied"
        eventProperties={{ file: target, section: "manual_install" }}
      />
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </figure>
  );
};

/**
 * Install instructions for one registry item: the `shadcn add` command
 * with package-manager tabs, and a "Manual installation" disclosure with
 * the dependencies and full source. Reads the item from registry/*.json,
 * so it fails the build if `name` is not in the registry.
 */
export const InstallBlock = async ({ name }: { name: string }) => {
  const item = await getRegistryItem(name);
  if (!item) {
    throw new Error(`InstallBlock: "${name}" is not in registry/*.json`);
  }

  const registryDependencies = item.registryDependencies ?? [];
  const needsCore = registryDependencies.includes(DITHER_CORE);
  const otherRegistry = registryDependencies
    .filter((dependency) => dependency !== DITHER_CORE)
    .map(resolveRegistryUrl);
  const npm = item.dependencies ?? [];
  const files = item.files ?? [];

  let step = 0;
  const next = () => {
    step += 1;
    return step;
  };

  return (
    <div className="not-first:mt-4">
      <InstallCommand urls={[registryItemUrl(name)]} />
      <ManualSteps>
        <ol className="mt-3 flex flex-col gap-6">
          {needsCore ? (
            <Step
              index={next()}
              title={
                <>
                  Install <code>dither-core</code>, the engine every component
                  uses. It brings the <code>dither-tokens</code> CSS variables
                  with it.
                </>
              }
            >
              <InstallCommand urls={[registryItemUrl("dither-core")]} />
            </Step>
          ) : null}
          {otherRegistry.length > 0 ? (
            <Step index={next()} title="Add the registry items it builds on.">
              <InstallCommand urls={otherRegistry} />
            </Step>
          ) : null}
          {npm.length > 0 ? (
            <Step
              index={next()}
              title={
                <>
                  Install the packages it imports:{" "}
                  {npm.map((dependency, index) => (
                    <span key={dependency}>
                      {index > 0 ? ", " : null}
                      <code>{dependency}</code>
                    </span>
                  ))}
                  .
                </>
              }
            />
          ) : null}
          {files.map((file) => {
            const target = file.target ?? file.path;
            return (
              <Step
                key={file.path}
                index={next()}
                title={
                  <>
                    Copy this into <code>{target}</code>.
                  </>
                }
              >
                <SourceFile path={file.path} target={target} />
              </Step>
            );
          })}
        </ol>
      </ManualSteps>
    </div>
  );
};
