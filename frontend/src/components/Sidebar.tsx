"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, PackageSearch, TrendingUp, Sparkles, ClipboardList, AlertTriangle, Shield, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const navigation = [
  { name: "Command Center", href: "/command-center", icon: Shield },
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Orders", href: "/orders", icon: ClipboardList },
  { name: "Risk Center", href: "/risk-center", icon: AlertTriangle },
  { name: "Inventory", href: "/inventory", icon: PackageSearch },
  { name: "AI Copilot", href: "/copilot", icon: Sparkles },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-screen w-72 flex-col bg-black/10 backdrop-blur-3xl border-r border-white/5 relative z-20 shadow-[4px_0_24px_rgba(0,0,0,0.5)]">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
      <div className="flex h-20 shrink-0 items-center px-8 border-b border-white/5 relative z-10">
        <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary animate-pulse" />
          <span className="bg-gradient-to-r from-primary via-blue-400 to-purple-500 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(100,255,255,0.4)]">
            Eluno
          </span>
        </h1>
      </div>
      <div className="flex flex-1 flex-col overflow-y-auto pt-8 relative z-10 hide-scrollbar">
        <nav className="flex-1 space-y-3 px-5">
          {navigation.map((item, i) => {
            const isActive = pathname === item.href;
            return (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05, duration: 0.4, ease: "easeOut" }}
              >
                <Link
                  href={item.href}
                  className={cn(
                    "group flex items-center rounded-2xl px-4 py-3.5 text-sm font-semibold transition-all duration-300 relative overflow-hidden",
                    isActive
                      ? "text-primary shadow-[0_0_20px_rgba(100,200,255,0.15)] bg-primary/10 border border-primary/20"
                      : "text-muted-foreground hover:bg-white/5 hover:text-foreground border border-transparent"
                  )}
                >
                  {isActive && (
                    <motion.div 
                      layoutId="active-nav-bg"
                      className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent pointer-events-none"
                      initial={false}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <item.icon
                    className={cn(
                      "mr-4 h-5 w-5 shrink-0 transition-all duration-300 relative z-10",
                      isActive ? "text-primary drop-shadow-[0_0_8px_rgba(100,255,255,0.8)] scale-110" : "text-muted-foreground group-hover:text-foreground"
                    )}
                  />
                  <span className="relative z-10 tracking-wide">{item.name}</span>
                </Link>
              </motion.div>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
// Triggering Next.js rebuild to clear hydration cache
