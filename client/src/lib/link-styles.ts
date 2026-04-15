import { cn } from "./utils";

export const appBrandLinkClass =
  "text-xl font-semibold tracking-tight text-foreground transition-opacity hover:opacity-80 md:text-2xl";

export const appTextLinkClass =
  "text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline";

const appNavLinkBaseClass = "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors";

export function getAppNavLinkClass(isActive: boolean) {
  return cn(
    appNavLinkBaseClass,
    isActive
      ? "bg-foreground text-background"
      : "text-muted-foreground hover:bg-muted hover:text-foreground",
  );
}
