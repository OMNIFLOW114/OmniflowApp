import React, { forwardRef } from "react";
import clsx from "clsx";

export const ScrollArea = forwardRef(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={clsx("relative overflow-auto rounded-md", className)}
      {...props}
    >
      {children}
    </div>
  );
});
ScrollArea.displayName = "ScrollArea";

export const ScrollBar = forwardRef(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={clsx(
        "absolute right-0 top-0 h-full w-2 bg-zinc-700/30 rounded-lg",
        className
      )}
      {...props}
    />
  );
});
ScrollBar.displayName = "ScrollBar";
