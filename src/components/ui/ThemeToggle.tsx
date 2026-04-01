'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { motion } from 'framer-motion';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-8 h-8 rounded-none border border-border flex items-center justify-center opacity-50">
        <div className="w-3 h-3 bg-foreground/20" />
      </div>
    );
  }

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="relative w-8 h-8 rounded-none border border-border flex items-center justify-center group hover:border-primary transition-colors focus:outline-none"
      aria-label="Toggle theme"
    >
      <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors" />
      
      <motion.div
        initial={false}
        animate={{
          scale: theme === 'dark' ? 0 : 1,
          rotate: theme === 'dark' ? 90 : 0,
          opacity: theme === 'dark' ? 0 : 1
        }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="absolute"
      >
        <Sun className="h-[14px] w-[14px] text-foreground" />
      </motion.div>

      <motion.div
        initial={false}
        animate={{
          scale: theme === 'dark' ? 1 : 0,
          rotate: theme === 'dark' ? 0 : -90,
          opacity: theme === 'dark' ? 1 : 0
        }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="absolute"
      >
        <Moon className="h-[14px] w-[14px] text-foreground" />
      </motion.div>

      {/* Decorative corner square */}
      <div className="absolute -top-[3px] -right-[3px] w-[5px] h-[5px] bg-primary scale-0 group-hover:scale-100 transition-transform origin-center" />
    </button>
  );
}
