'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';

const navLinks = [
  { href: '#how-it-works', label: 'Protocol' },
  { href: '#chains', label: 'Chains' },
  { href: '#developer', label: 'Developers' },
  { href: '#pricing', label: 'Pricing' },
];

import { ThemeToggle } from "@/components/ui/ThemeToggle";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  return (
    <>
      <motion.nav
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled ? 'bg-background/90 backdrop-blur-md border-b border-border' : ''
        }`}
      >
        <div className="flex items-center justify-between h-14 px-6 md:px-10 max-w-[1400px] mx-auto">
          {/* Logo — Sutera style: bold monospace */}
          <a href="/" className="text-[13px] font-mono font-bold tracking-[0.25em] uppercase text-foreground">
            NEXUS
          </a>

          {/* Center nav — Sutera uses a center action button */}
          <div className="hidden md:flex items-center">
            <a href="#pricing">
              <button className="sutera-btn group">
                <span className="relative z-10">Start Building</span>
              </button>
            </a>
          </div>

          {/* Right side — links + Theme Toggle */}
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-1 opacity-60">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="px-3 py-2 text-[10px] font-mono font-medium tracking-[0.1em] uppercase text-foreground/70 hover:text-foreground transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>
            <div className="h-4 w-[1px] bg-border mx-2" />
            <ThemeToggle />
          </div>

          {/* Mobile */}
          <div className="flex items-center gap-4 md:hidden">
            <ThemeToggle />
            <button
              onClick={() => setMobileOpen(true)}
              className="text-foreground"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed inset-0 z-[60] bg-background p-6"
        >
          <div className="flex items-center justify-between mb-20">
            <span className="text-[14px] font-mono font-bold tracking-[0.3em] uppercase text-primary">NEXUS</span>
            <button onClick={() => setMobileOpen(false)} className="p-2 border border-border text-foreground hover:border-primary transition-all">
              <X size={20} />
            </button>
          </div>
          <nav className="space-y-2">
            {navLinks.map((link, i) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="group block py-6 border-b border-border/50 hover:border-primary transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-black uppercase tracking-tighter text-foreground group-hover:text-primary transition-colors">{link.label}</span>
                  <span className="text-[10px] font-mono text-muted-foreground font-bold">/0{i + 1}</span>
                </div>
              </a>
            ))}
          </nav>
          <div className="mt-20">
            <a href="#pricing" onClick={() => setMobileOpen(false)}>
              <button className="w-full py-5 bg-primary text-primary-foreground text-[11px] font-mono font-bold uppercase tracking-[0.2em] shadow-[0_0_15px_rgba(0,209,255,0.3)]">
                Start Building →
              </button>
            </a>
          </div>
        </motion.div>
      )}
    </>
  );
}
