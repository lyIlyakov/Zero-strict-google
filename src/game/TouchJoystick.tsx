import { useEffect, useState } from 'react';
import { JOYSTICK_TRAVEL } from './touchControls';

/**
 * Detects touch capability via coarse pointer, maxTouchPoints, narrow viewport,
 * or live touch events, with an optional manual user override.
 */
export function useTouchAvailable(override: 'auto' | 'on' | 'off' = 'auto') {
  const [detected, setDetected] = useState(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(any-pointer: coarse)').matches ||
      (navigator.maxTouchPoints ?? 0) > 0 ||
      window.innerWidth <= 820
    );
  });

  useEffect(() => {
    const onTouch = (event: PointerEvent) => {
      if (event.pointerType === 'touch') setDetected(true);
    };
    const onResize = () => {
      if (
        window.matchMedia('(any-pointer: coarse)').matches ||
        (navigator.maxTouchPoints ?? 0) > 0 ||
        window.innerWidth <= 820
      ) {
        setDetected(true);
      }
    };
    window.addEventListener('pointerdown', onTouch, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('pointerdown', onTouch, true);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  if (override === 'on') return true;
  if (override === 'off') return false;
  return detected;
}

export function TouchJoystick({ knobRef }: { knobRef: React.Ref<HTMLSpanElement> }) {
  return (
    <div
      className="station-joystick"
      data-joystick
      aria-hidden="true"
      style={{ '--joystick-travel': `${JOYSTICK_TRAVEL}px` } as React.CSSProperties}
    >
      <div className="station-joystick__cross" />
      <span ref={knobRef} className="station-joystick__knob" />
    </div>
  );
}
