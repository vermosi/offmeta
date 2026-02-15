import * as React from 'react';
import * as TogglePrimitive from '@radix-ui/react-toggle';
import type { ToggleVariants } from '@/components/ui/toggle-variants';
import { toggleVariants } from '@/components/ui/toggle-variants';

import { cn } from '@/lib/core/utils';

const Toggle = React.forwardRef<
  React.ElementRef<typeof TogglePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> & ToggleVariants
>(({ className, variant, size, ...props }, ref) => (
  <TogglePrimitive.Root
    ref={ref}
    className={cn(toggleVariants({ variant, size, className }))}
    {...props}
  />
));

Toggle.displayName = TogglePrimitive.Root.displayName;

export { Toggle };
