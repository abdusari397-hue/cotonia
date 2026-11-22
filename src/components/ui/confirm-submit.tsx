"use client";

import type { ButtonHTMLAttributes } from "react";

/** Submit button that asks for confirmation first (for destructive actions). */
export function ConfirmSubmit({
  message,
  onClick,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { message: string }) {
  return (
    <button
      type="submit"
      {...props}
      onClick={(event) => {
        if (!window.confirm(message)) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
    />
  );
}
