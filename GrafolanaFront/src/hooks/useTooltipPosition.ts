import { useState, useEffect, RefObject } from 'react';

interface TooltipPosition {
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  transform?: string;
}

export function useTooltipPosition(
  triggerRef: RefObject<HTMLElement | null>,
  tooltipRef: RefObject<HTMLElement | null>
): TooltipPosition {
  const [position, setPosition] = useState<TooltipPosition>({});

  useEffect(() => {
    function updatePosition() {
      if (!triggerRef.current || !tooltipRef.current) {
        return; // Exit if either ref is null
      }

      const trigger = triggerRef.current.getBoundingClientRect();
      const tooltip = tooltipRef.current.getBoundingClientRect();
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight
      };

      const spaceAbove = trigger.top;
      const spaceBelow = viewport.height - trigger.bottom;
      const preferredVertical = spaceAbove > spaceBelow ? 'top' : 'bottom';

      const newPosition: TooltipPosition = {};

      if (preferredVertical === 'top') {
        newPosition.bottom = `${trigger.height + 8}px`;
      } else {
        newPosition.top = `${trigger.height + 8}px`;
      }

      const idealLeft = trigger.width / 2 - tooltip.width / 2;
      const maxLeft = viewport.width - tooltip.width - 8;
      const finalLeft = Math.max(8, Math.min(idealLeft, maxLeft));

      newPosition.left = `${finalLeft}px`;
      
      setPosition(newPosition);
    }

    window.addEventListener('resize', updatePosition);
    updatePosition();

    return () => window.removeEventListener('resize', updatePosition);
  }, [triggerRef, tooltipRef]);

  return position;
}