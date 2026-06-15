"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, LineChart, Line } from "recharts";
import { AlertTriangle, TrendingUp, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function RiskCenterPage() {
  const [highRiskOrders, setHighRiskOrders] = useState<any[]>([]);
  const [forecasts, setForecasts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);

  const fetchRiskData = async () => {
    setLoading(true);
    try {
      const [riskRes, forecastRes] = await Promise.all([
        fetch("http://localhost:8000/api/orders/risk"),
        fetch("http://localhost:8000/api/forecast")
      ]);
      const riskData = await riskRes.json();
      const forecastData = await forecastRes.json();
      setHighRiskOrders(riskData);
      setForecasts(forecastData);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRiskData();
  }, []);

  const handleRecalculate = async () => {
    setRecalculating(true);
    await fetch("http://localhost:8000/api/orders/recalculate-risk", { method: "POST" });
    fetchRiskData();
    setRecalculating(false);
  };

  if (loading && highRiskOrders.length === 0) return <div className="p-8 text-center animate-pulse">Loading Risk Analytics...</div>;

  // Synthetic charts based on the high risk data
  const breachData = [
    { name: "Will Breach", value: highRiskOrders.filter(o => o.will_breach).length },
    { name: "Within SLA", value: highRiskOrders.filter(o => !o.will_breach).length },
  ];
  const COLORS = ['#ef4444', '#3b82f6'];

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500 h-full overflow-y-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-red-500 flex items-center">
            <AlertTriangle className="mr-2" />
            AI Risk Center
          </h2>
          <p className="text-muted-foreground">Predictive SLA monitoring and root cause analysis powered by Eluno AI.</p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleRecalculate} 
          disabled={recalculating}
          className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
        >
          <RefreshCw className={cn("mr-2 h-4 w-4", recalculating && "animate-spin")} />
          Recalculate Network Risk
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card className="bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle>SLA Breach Forecast</CardTitle>
            <CardDescription>Predicted breaches among high-risk orders</CardDescription>
          </CardHeader>
          <CardContent className="h-64 flex justify-center items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={breachData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {breachData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: 'none', borderRadius: '8px' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle>High Risk Orders Action Center</CardTitle>
          <CardDescription>Orders requiring immediate operational intervention.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Risk Score</TableHead>
                <TableHead>Predicted TAT</TableHead>
                <TableHead>SLA Breach</TableHead>
                <TableHead>Root Cause</TableHead>
                <TableHead>Recommended Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {highRiskOrders.map((pred: any) => (
                <TableRow key={pred.id}>
                  <TableCell className="font-medium">
                    <Link href={`/orders/${pred.order_id}`} className="hover:underline text-primary">
                      {pred.order_id} {/* Ideally order_number, but we didn't join it cleanly in the schema response. Wait, we'll fix order_id to order_number if possible, but let's just use order_id for link */}
                      ORD-{pred.order_id}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <div className="w-full bg-muted rounded-full h-2 mr-2 max-w-[50px]">
                        <div className="bg-red-500 h-2 rounded-full" style={{ width: `${pred.risk_score}%` }}></div>
                      </div>
                      <span className="text-red-500 font-bold">{pred.risk_score}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {pred.predicted_completion_days} days
                  </TableCell>
                  <TableCell>
                    {pred.will_breach ? (
                      <Badge variant="outline" className="bg-red-500/10 text-red-500 border-none">
                        <AlertCircle className="w-3 h-3 mr-1"/> Yes ({pred.confidence}% conf)
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-none">
                        <CheckCircle2 className="w-3 h-3 mr-1"/> No
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate" title={pred.root_cause}>
                    {pred.root_cause}
                  </TableCell>
                  <TableCell className="font-medium text-amber-500">
                    {pred.recommended_action}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* FORECASTING SECTION */}
      <div className="pt-4 border-t border-white/10 mt-8">
        <h3 className="text-2xl font-bold tracking-tight mb-2 text-primary flex items-center">
          <TrendingUp className="mr-2 h-6 w-6" />
          Demand Forecasting
        </h3>
        <p className="text-muted-foreground mb-6">AI-driven predictive analytics for optimal stock levels.</p>
        
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="bg-card/50 backdrop-blur border-primary/20 shadow-lg col-span-2 lg:col-span-1">
            <CardHeader>
              <CardTitle>Top Restock Recommendations</CardTitle>
              <CardDescription>Highest priority items based on projected demand</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              {loading ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">Loading chart...</div>
              ) : forecasts.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">No forecast data available.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={forecasts.slice(0, 5).map(f => ({ name: `${f.lens_type} (${f.power})`, quantity: f.recommended_quantity }))} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <RechartsTooltip cursor={{ fill: 'hsl(var(--muted)/0.5)' }} contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }} />
                    <Bar dataKey="quantity" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={50} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur border-border/50 col-span-2 lg:col-span-1">
            <CardHeader>
              <CardTitle>Actionable Intelligence</CardTitle>
              <CardDescription>Detailed forecast breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border border-border/50 overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Type & Power</TableHead>
                      <TableHead className="text-right">Rec. Qty</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center py-4 text-muted-foreground">Loading...</TableCell>
                      </TableRow>
                    ) : forecasts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center py-4 text-muted-foreground">No forecast data available.</TableCell>
                      </TableRow>
                    ) : (
                      forecasts.slice(0, 5).map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="font-medium">{item.lens_type}</div>
                            <div className="text-xs text-muted-foreground">{item.forecast_reason} (SPH: {item.power})</div>
                          </TableCell>
                          <TableCell className="text-right font-bold text-primary">{item.recommended_quantity}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

    </div>
  );
}
