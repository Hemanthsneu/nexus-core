'use client';

import { useScroll, useTransform, motion } from 'framer-motion';

export default function HUDOverlay() {
  const { scrollYProgress } = useScroll();
  const barHeight = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);

  return (
    <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden select-none">
      <div className="absolute left-6 md:left-10 top-1/2 -translate-y-1/2 flex flex-col items-center gap-4 opacity-20 hover:opacity-100 transition-opacity">
        <div className="h-32 w-[1px] bg-border relative">
          <motion.div
            style={{ height: barHeight }}
            className="absolute top-0 left-0 w-full bg-primary"
          />
        </div>
      </div>
    </div>
  );
}
