"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Bot, User, ShieldAlert, PackageOpen, AlertTriangle, PackageX, FileWarning, Sparkles, Activity, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, Variants } from "framer-motion";
import { api } from "@/lib/api";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export default function CommandCenterPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<Record<string, any> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [demoStats, setDemoStats] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);

  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      fetch(api("/api/operations/briefing")).then(r => r.json()),
      fetch(api("/api/operations/demo-stats")).then(r => r.json()),
      fetch(api("/api/operations/recent-alerts")).then(r => r.json())
    ]).then(([briefingData, demoData, alertsData]) => {
      setData(briefingData);
      setDemoStats(demoData);
      setRecentAlerts(alertsData || []);
      setLoading(false);
    });
  }, []);

  if (loading || !data || !demoStats) return <div className="p-8 text-center animate-pulse">Initializing Agentic Workspace...</div>;

  return (
    <div className="flex flex-col h-screen overflow-hidden p-6 space-y-6 animate-in fade-in duration-500">
      
      <div className="shrink-0 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-primary flex items-center">
            <Sparkles className="mr-2 h-6 w-6" />
            Operations Command Center
          </h2>
          <p className="text-muted-foreground mt-1">Autonomous Agent Workspace</p>
        </div>
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="flex-1 overflow-y-auto pr-2 space-y-6 hide-scrollbar"
      >
        
        {/* TOP SECTION: EXECUTIVE SUMMARY */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <motion.div variants={itemVariants}>
            <Card className="bg-white/5 dark:bg-black/20 backdrop-blur-xl border-l-4 border-l-blue-500 border-white/10 shadow-lg hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all duration-300">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center">
                  <PackageOpen className="w-3 h-3 mr-1 text-blue-400"/> Active Orders
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent">{data.metrics.total_orders}</div>
              </CardContent>
            </Card>
          </motion.div>
          
          <motion.div variants={itemVariants}>
            <Card className="bg-white/5 dark:bg-black/20 backdrop-blur-xl border-l-4 border-l-cyan-500 border-white/10 shadow-lg hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all duration-300">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center">
                  <PackageOpen className="w-3 h-3 mr-1 text-cyan-400"/> Waiting Proc.
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-cyan-500 drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]">{data.metrics.waiting_for_procurement || 0}</div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="bg-white/5 dark:bg-black/20 backdrop-blur-xl border-l-4 border-l-orange-500 border-white/10 shadow-lg hover:shadow-[0_0_20px_rgba(249,115,22,0.3)] transition-all duration-300">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center">
                  <ShieldAlert className="w-3 h-3 mr-1 text-orange-400"/> High Risk
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-orange-500 drop-shadow-[0_0_10px_rgba(249,115,22,0.5)]">{data.metrics.high_risk}</div>
              </CardContent>
            </Card>
          </motion.div>
          
          <motion.div variants={itemVariants}>
            <Card className="bg-white/5 dark:bg-black/20 backdrop-blur-xl border-l-4 border-l-red-500 border-white/10 shadow-lg hover:shadow-[0_0_20px_rgba(239,68,68,0.3)] transition-all duration-300">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center">
                  <AlertTriangle className="w-3 h-3 mr-1 text-red-400"/> SLA Breaches
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]">{data.metrics.predicted_breaches}</div>
              </CardContent>
            </Card>
          </motion.div>
          
          <motion.div variants={itemVariants}>
            <Card className="bg-white/5 dark:bg-black/20 backdrop-blur-xl border-l-4 border-l-amber-500 border-white/10 shadow-lg hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all duration-300">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center">
                  <PackageX className="w-3 h-3 mr-1 text-amber-400"/> Shortages
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-amber-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]">{data.metrics.shortages}</div>
              </CardContent>
            </Card>
          </motion.div>
          
          <motion.div variants={itemVariants}>
            <Card className="bg-white/5 dark:bg-black/20 backdrop-blur-xl border-l-4 border-l-purple-500 border-white/10 shadow-lg hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all duration-300">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center">
                  <FileWarning className="w-3 h-3 mr-1 text-purple-400"/> QC Failures
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-purple-500 drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]">{data.metrics.qc_failures}</div>
              </CardContent>
            </Card>
          </motion.div>
        </div>


        {/* MIDDLE SECTION: ACTIONS & BRIEFING */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div variants={itemVariants} className="lg:col-span-2">
            <Card className="h-full bg-white/5 dark:bg-black/20 backdrop-blur-xl shadow-lg border-white/10 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute -top-10 -right-10 p-4 opacity-10 pointer-events-none transform group-hover:scale-110 transition-transform duration-700">
                <Bot className="w-48 h-48 text-primary" />
              </div>
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
              <Bot className="w-32 h-32" />
            </div>
            <CardHeader>
              <CardTitle className="flex items-center">
                AI Daily Briefing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-lg leading-relaxed text-foreground font-medium">
                {data.briefing}
              </p>
              <div className="mt-6">
                <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">Agent Recommended Actions</h4>
                <ul className="space-y-2">
                  {data.recommendations.map((rec: string, idx: number) => (
                    <li key={idx} className="flex items-start bg-muted/50 p-2 rounded-md">
                      <Badge variant="default" className="mr-3 shrink-0">{idx + 1}</Badge>
                      <span className="text-sm font-medium">{rec}</span>
                    </li>
                  ))}
                  {data.recommendations.length === 0 && (
                    <li className="text-sm text-muted-foreground">No critical actions required at this time.</li>
                  )}
                </ul>
              </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="h-full bg-white/5 dark:bg-black/20 backdrop-blur-xl border-green-500/30 shadow-lg relative overflow-hidden group hover:border-green-500/60 transition-colors duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent pointer-events-none" />
            <CardHeader>
              <CardTitle className="text-green-500 flex items-center">
                <Activity className="w-5 h-5 mr-2" />
                AI Actions Prevented
              </CardTitle>
              <CardDescription>Demo Mode Projection</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-sm text-muted-foreground">Potential SLA Breaches</span>
                <span className="font-bold text-lg">{demoStats.potential_breaches}</span>
              </div>
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-sm text-muted-foreground">After Recommendations</span>
                <span className="font-bold text-lg text-green-500">{demoStats.after_recommendations}</span>
              </div>
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-sm text-muted-foreground">Breaches Prevented</span>
                <Badge variant="default" className="bg-green-500 text-white border-none text-base">
                  {demoStats.breaches_prevented}
                </Badge>
              </div>
              <div className="pt-2 text-center">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Estimated Improvement</span>
                <div className="text-3xl font-black text-primary mt-1">+{demoStats.estimated_improvement}%</div>
              </div>
            </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* RECENT ALERTS SECTION */}
        <motion.div variants={itemVariants} className="mt-8">
          <Card className="bg-white/5 dark:bg-black/20 backdrop-blur-xl border-white/10 shadow-lg">
            <CardHeader className="border-b border-white/10 bg-black/20">
              <CardTitle className="flex items-center text-primary">
                <Mail className="w-5 h-5 mr-2" />
                Recent Automated Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {recentAlerts.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No recent alerts sent.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground uppercase bg-black/20">
                      <tr>
                        <th className="px-6 py-3">Alert Type</th>
                        <th className="px-6 py-3">Order</th>
                        <th className="px-6 py-3">Recipient</th>
                        <th className="px-6 py-3">Time Sent</th>
                        <th className="px-6 py-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentAlerts.map((alert) => (
                        <tr key={alert.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 font-medium text-foreground">{alert.alert_type.replace(/_/g, ' ')}</td>
                          <td className="px-6 py-4">{alert.order?.order_number || `ID: ${alert.order_id}`}</td>
                          <td className="px-6 py-4 text-muted-foreground">{alert.recipient}</td>
                          <td className="px-6 py-4 text-muted-foreground">{new Date(alert.sent_at).toLocaleString()}</td>
                          <td className="px-6 py-4 text-right">
                            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                              {alert.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

      </motion.div>
    </div>
  );
}
