'use client';

import { motion } from 'framer-motion';

export default function DashboardPage() {
  return (
    <div className="space-y-12">
      <header>
        <h1 className="text-3xl font-black uppercase tracking-tighter text-foreground mb-2">Dashboard</h1>
        <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest">Protocol Stats & Operational Control / V2.1</p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Settled', value: '$128.4M', change: '+12%', sub: 'USDC/USDT' },
          { label: 'Active Chains', value: '14', change: 'MAX', sub: 'NETWORK LOAD OK' },
          { label: 'Avg. Latency', value: '2.4s', change: '-0.4s', sub: 'OPTIMIZATION ACTIVE' },
          { label: 'Compliance Status', value: 'SECURE', change: '100%', sub: 'FULLY AUDITED' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="info-window p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <span className="mono-label">{stat.label}</span>
              <span className="text-[9px] font-mono text-primary">{stat.change}</span>
            </div>
            <div>
              <div className="text-2xl font-black text-foreground">{stat.value}</div>
              <div className="mono-label mt-1 opacity-50">{stat.sub}</div>
            </div>
            <div className="h-[2px] w-full bg-muted/20 relative overflow-hidden">
              <motion.div 
                initial={{ x: '-100%' }}
                animate={{ x: '0%' }}
                transition={{ duration: 1.5, delay: 0.5 + i * 0.1 }}
                className="absolute inset-0 bg-primary/40" 
              />
            </div>
          </motion.div>
        ))}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="info-window p-0 h-[400px] flex flex-col">
          <div className="info-window-bar border-b border-border">
            <span>Network Activity Monitor</span>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span>Real-time</span>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center p-10">
            <div className="text-center space-y-4">
              <div className="text-3xl font-black text-foreground opacity-10">CORE ENGINE INACTIVE</div>
              <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest max-w-xs mx-auto">
                Protocol engine not detected in local context. Initializing core development environment...
              </p>
              <button className="sutera-btn mt-6">Initialize Engine</button>
            </div>
          </div>
        </div>

        <div className="info-window p-0 h-[400px] flex flex-col bg-card">
          <div className="info-window-bar border-b border-border">
            <span>Operational Log</span>
            <span>SYSTEM_OUTPUT v2.1.0</span>
          </div>
          <div className="flex-1 p-6 font-mono text-[10px] space-y-2 overflow-y-auto hide-scrollbar">
            <div className="text-primary">[01:24:55] BOOT SEQUENCE INITIATED</div>
            <div className="text-muted-foreground">[01:24:56] PRE-FLIGHT CHECKS: PASSING</div>
            <div className="text-muted-foreground">[01:24:57] IDENTITY AGENT ... CONNECTED</div>
            <div className="text-muted-foreground">[01:25:01] CHAIN CONNECTOR :: BASE_MAINNET ... OK</div>
            <div className="text-muted-foreground">[01:25:02] CHAIN CONNECTOR :: SOLANA_RPC ... OK</div>
            <div className="text-muted-foreground">[01:25:05] DATA LAKE SYNC: 100% COMPLETE</div>
            <div className="text-foreground">[01:30:00] STANDBY MODE ACTIVE</div>
            <div className="typing-cursor" />
          </div>
        </div>
      </section>
    </div>
  );
}
