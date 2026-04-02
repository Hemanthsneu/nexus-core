'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

import { ThemeToggle } from "@/components/ui/ThemeToggle";

export default function Navbar() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', h);

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserEmail(user?.email ?? null);
    });

    return () => window.removeEventListener('scroll', h);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

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
          <a href="/" className="text-[13px] font-mono font-bold tracking-[0.25em] uppercase text-foreground">
            NEXUS
          </a>

          <div className="hidden md:flex items-center gap-1">
            <a href="/" className="px-3 py-2 text-[10px] font-mono font-medium tracking-[0.1em] uppercase text-foreground/70 hover:text-foreground transition-colors">
              Dashboard
            </a>
            <a href="/settings" className="px-3 py-2 text-[10px] font-mono font-medium tracking-[0.1em] uppercase text-foreground/70 hover:text-foreground transition-colors">
              API Keys
            </a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            {userEmail && (
              <span className="text-[9px] font-mono text-muted-foreground truncate max-w-[160px]">
                {userEmail}
              </span>
            )}
            <div className="h-4 w-[1px] bg-border" />
            <ThemeToggle />
            {userEmail && (
              <>
                <div className="h-4 w-[1px] bg-border" />
                <button
                  onClick={handleLogout}
                  className="text-[9px] font-mono font-bold uppercase tracking-widest text-muted-foreground hover:text-destructive transition-colors"
                >
                  Logout
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-4 md:hidden">
            <ThemeToggle />
            <button onClick={() => setMobileOpen(true)} className="text-foreground">
              <Menu size={20} />
            </button>
          </div>
        </div>
      </motion.nav>

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
            {[
              { href: '/', label: 'Dashboard' },
              { href: '/settings', label: 'API Keys' },
            ].map((link, i) => (
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
          {userEmail && (
            <div className="mt-20">
              <div className="text-[10px] font-mono text-muted-foreground mb-4">{userEmail}</div>
              <button
                onClick={() => { handleLogout(); setMobileOpen(false); }}
                className="w-full py-5 bg-destructive/20 text-destructive text-[11px] font-mono font-bold uppercase tracking-[0.2em] border border-destructive/30"
              >
                Logout
              </button>
            </div>
          )}
        </motion.div>
      )}
    </>
  );
}
