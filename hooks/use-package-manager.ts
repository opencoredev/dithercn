import { useAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";

export const PACKAGE_MANAGERS = ["npm", "yarn", "pnpm", "bun"] as const;

export type PackageManager = (typeof PACKAGE_MANAGERS)[number];

export const isPackageManager = (value: string): value is PackageManager =>
  PACKAGE_MANAGERS.some((pm) => pm === value);

const packageManagerAtom = atomWithStorage<PackageManager>(
  "package-manager",
  "pnpm"
);

export const usePackageManager = () => useAtom(packageManagerAtom);
