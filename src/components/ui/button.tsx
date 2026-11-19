import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 min-h-[44px] cursor-pointer select-none',
  {
    variants: {
      variant: {
        default: 'bg-slate-900 text-white shadow-xs hover:bg-slate-800',
        primary: 'bg-indigo-600 text-white shadow-xs hover:bg-indigo-700',
        secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200/80',
        outline: 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-900',
        ghost: 'hover:bg-slate-100 text-slate-700',
        destructive: 'bg-red-600 text-white hover:bg-red-700',
      },
      size: {
        default: 'px-4 py-2.5',
        sm: 'min-h-[36px] rounded-lg px-3 text-xs',
        lg: 'min-h-[48px] px-6 text-base',
        icon: 'h-11 w-11 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
