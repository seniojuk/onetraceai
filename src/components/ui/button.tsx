import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Single source of truth for buttons across the app.
 *
 * Variants map 1:1 to the `.btn-3d-*` styles documented on the Design System
 * page (src/index.css → "btn-3d variants"). The base `btn-3d` class supplies
 * the press feedback, focus ring, disabled state, and motion tokens; the
 * variant class supplies the colour scheme, and the size class supplies the
 * height/padding. Adding `btn-3d` everywhere keeps every Button — old or new —
 * visually consistent with the design system.
 */
const buttonVariants = cva(
  "btn-3d inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium " +
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 " +
    "motion-reduce:transition-none",
  {
    variants: {
      variant: {
        default: "btn-3d-primary",
        primary: "btn-3d-primary",
        secondary: "btn-3d-secondary",
        outline: "btn-3d-outline",
        ghost: "btn-3d-ghost",
        accent: "btn-3d-accent",
        destructive: "btn-3d-destructive",
        // Link keeps a typographic style — opt out of the 3d chrome on purpose.
        link: "!bg-transparent !shadow-none text-primary underline-offset-4 hover:underline active:scale-100",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-11 px-8 text-[14px]",
        icon: "h-10 w-10 px-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
