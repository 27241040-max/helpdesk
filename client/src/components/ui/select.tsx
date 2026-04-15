import * as React from "react";
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { Select } from "radix-ui";

import { cn } from "@/lib/utils";

function SelectRoot(props: React.ComponentProps<typeof Select.Root>) {
  return <Select.Root data-slot="select" {...props} />;
}

function SelectValue(props: React.ComponentProps<typeof Select.Value>) {
  return <Select.Value data-slot="select-value" {...props} />;
}

function SelectTrigger({
  children,
  className,
  ...props
}: React.ComponentProps<typeof Select.Trigger>) {
  return (
    <Select.Trigger
      className={cn(
        "flex h-10 w-fit min-w-52 items-center justify-between gap-3 rounded-full border border-border/80 bg-muted/25 px-4 text-sm text-card-foreground shadow-none outline-none transition-colors data-[placeholder]:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 md:min-w-64",
        className,
      )}
      data-slot="select-trigger"
      {...props}
    >
      {children}
      <Select.Icon asChild>
        <ChevronDownIcon className="size-4 text-muted-foreground" />
      </Select.Icon>
    </Select.Trigger>
  );
}

function SelectContent({
  children,
  className,
  position = "popper",
  ...props
}: React.ComponentProps<typeof Select.Content>) {
  return (
    <Select.Portal>
      <Select.Content
        className={cn(
          "relative z-50 max-h-80 min-w-[8rem] overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className,
        )}
        data-slot="select-content"
        position={position}
        {...props}
      >
        <Select.ScrollUpButton className="flex h-8 cursor-default items-center justify-center text-muted-foreground">
          <ChevronUpIcon className="size-4" />
        </Select.ScrollUpButton>
        <Select.Viewport
          className={cn("p-1", position === "popper" && "w-full min-w-[var(--radix-select-trigger-width)]")}
        >
          {children}
        </Select.Viewport>
        <Select.ScrollDownButton className="flex h-8 cursor-default items-center justify-center text-muted-foreground">
          <ChevronDownIcon className="size-4" />
        </Select.ScrollDownButton>
      </Select.Content>
    </Select.Portal>
  );
}

function SelectItem({
  children,
  className,
  ...props
}: React.ComponentProps<typeof Select.Item>) {
  return (
    <Select.Item
      className={cn(
        "relative flex w-full cursor-default items-center rounded-xl py-2 pr-8 pl-3 text-sm outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-muted data-[highlighted]:text-foreground",
        className,
      )}
      data-slot="select-item"
      {...props}
    >
      <span className="absolute right-3 flex size-4 items-center justify-center">
        <Select.ItemIndicator>
          <CheckIcon className="size-4" />
        </Select.ItemIndicator>
      </span>
      <Select.ItemText>{children}</Select.ItemText>
    </Select.Item>
  );
}

export {
  SelectContent,
  SelectItem,
  SelectRoot as Select,
  SelectTrigger,
  SelectValue,
};
