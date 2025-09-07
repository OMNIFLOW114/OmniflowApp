import React from "react";
import clsx from "clsx";

export const Skeleton = ({ className }) => {
  return (
    <div
      className={clsx(
        "animate-pulse rounded-md bg-zinc-700/40",
        className
      )}
    />
  );
};

export default Skeleton;
