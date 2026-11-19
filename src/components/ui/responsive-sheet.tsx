import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Drawer } from 'vaul';
import { X } from 'lucide-react';
import { useMediaQuery } from '@/hooks/use-media-query';

interface ResponsiveSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function ResponsiveSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
}: ResponsiveSheetProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)');

  if (isDesktop) {
    return (
      <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-xs transition-opacity duration-300" />
          <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto transition-all duration-300 ease-out scale-100 opacity-100 data-[state=open]:scale-100 data-[state=open]:opacity-100 data-[state=closed]:scale-95 data-[state=closed]:opacity-0">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <DialogPrimitive.Title className="text-lg font-semibold text-slate-900">
                  {title}
                </DialogPrimitive.Title>
                {description && (
                  <DialogPrimitive.Description className="text-sm text-slate-500 mt-1">
                    {description}
                  </DialogPrimitive.Description>
                )}
              </div>
              <DialogPrimitive.Close className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer">
                <X className="h-4 w-4" />
              </DialogPrimitive.Close>
            </div>
            {children}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    );
  }

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-xs transition-opacity duration-300" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mt-20 flex max-h-[92vh] flex-col rounded-t-3xl border-t border-slate-200 bg-white pb-safe shadow-2xl transition-all duration-300 ease-out translate-y-0 data-[state=open]:translate-y-0 data-[state=closed]:translate-y-full">
          <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-slate-300" />
          <div className="p-5 overflow-y-auto">
            <Drawer.Title className="text-lg font-semibold text-slate-900">
              {title}
            </Drawer.Title>
            {description && (
              <Drawer.Description className="text-sm text-slate-500 mt-1">
                {description}
              </Drawer.Description>
            )}
            <div className="mt-4">{children}</div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
