"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LayoutGrid, List, AlertCircle, PackageCheck, PackageOpen, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

type Order = {
  id: number;
  order_number: string;
  customer_name: string;
  store_id: number;
  lens_type: string;
  current_status: string;
  inventory_available: boolean;
  created_at: string;
};

const STATUSES = [
  "PLACED",
  "PRESCRIPTION_VERIFICATION",
  "LENS_ALLOCATION",
  "LAB_PROCESSING",
  "COATING",
  "QUALITY_CHECK",
  "REWORK_REQUIRED",
  "PACKAGING",
  "SHIPPING",
  "DELIVERED"
];

export function OrdersDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // New Filter/Sort States
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [lensFilter, setLensFilter] = useState("ALL");
  const [inventoryFilter, setInventoryFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("created_at_desc");

  useEffect(() => {
    Promise.all([
      fetch(api("/api/orders")).then(res => {
        if (!res.ok) throw new Error("Fetch failed");
        return res.json();
      }),
      fetch(api("/api/orders/stats")).then(res => {
        if (!res.ok) throw new Error("Fetch failed");
        return res.json();
      })
    ]).then(([ordersData, statsData]) => {
      setOrders(ordersData);
      setStats(statsData);
      setLoading(false);
    }).catch(err => {
      console.error("Error fetching orders:", err);
      setError(true);
      setLoading(false);
    });
  }, []);

  let filteredOrders = orders.filter(o => {
    const matchesSearch = o.order_number.toLowerCase().includes(search.toLowerCase()) || 
                          o.customer_name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || o.current_status === statusFilter;
    const matchesLens = lensFilter === "ALL" || o.lens_type === lensFilter;
    const matchesInventory = inventoryFilter === "ALL" || 
      (inventoryFilter === "AVAILABLE" && o.inventory_available) ||
      (inventoryFilter === "PROCURING" && !o.inventory_available);
      
    return matchesSearch && matchesStatus && matchesLens && matchesInventory;
  });

  filteredOrders.sort((a, b) => {
    if (sortBy === "created_at_desc") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sortBy === "created_at_asc") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (sortBy === "customer_name") return a.customer_name.localeCompare(b.customer_name);
    if (sortBy === "status") return a.current_status.localeCompare(b.current_status);
    return 0;
  });

  const getStatusColor = (status: string) => {
    if (status === "DELIVERED") return "bg-green-500/10 text-green-500";
    if (status === "REWORK_REQUIRED") return "bg-red-500/10 text-red-500";
    if (status === "QUALITY_CHECK") return "bg-orange-500/10 text-orange-500";
    return "bg-blue-500/10 text-blue-500";
  };

  if (error) return <div className="p-8 text-center text-destructive">Failed to connect to the backend. It might be restarting, please try reloading the page.</div>;
  if (loading || !stats) return <div className="p-8 text-center animate-pulse">Loading workflow and AI predictions...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Order Lifecycle Engine</h2>
          <p className="text-muted-foreground">Manage and track eyewear fulfillment workflow.</p>
        </div>
        <Link href="/orders/new">
          <Button>Create New Order</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Orders At Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{stats.orders_at_risk}</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur border-red-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-red-500">Predicted SLA Breaches</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{stats.predicted_breaches}</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Predicted TAT</CardTitle>
            <ActivityIcon className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avg_tat} <span className="text-sm font-normal text-muted-foreground">days</span></div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Average Risk Score</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avg_risk_score}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4 mb-4">
        <div className="flex gap-2 w-full max-w-sm">
          <Input 
            placeholder="Search by order number or customer..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-background w-full"
          />
        </div>
        
        <div className="flex flex-wrap gap-4">
          <select 
            className="flex h-9 w-[180px] items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option className="bg-slate-950 text-white" value="ALL">All Statuses</option>
            {STATUSES.map(s => <option className="bg-slate-950 text-white" key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
          </select>
          
          <select 
            className="flex h-9 w-[180px] items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            value={lensFilter}
            onChange={e => setLensFilter(e.target.value)}
          >
            <option className="bg-slate-950 text-white" value="ALL">All Lens Types</option>
            <option className="bg-slate-950 text-white" value="Single Vision">Single Vision</option>
            <option className="bg-slate-950 text-white" value="Bifocal">Bifocal</option>
            <option className="bg-slate-950 text-white" value="Progressive">Progressive</option>
          </select>
          
          <select 
            className="flex h-9 w-[180px] items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            value={inventoryFilter}
            onChange={e => setInventoryFilter(e.target.value)}
          >
            <option className="bg-slate-950 text-white" value="ALL">All Inventory Status</option>
            <option className="bg-slate-950 text-white" value="AVAILABLE">Available</option>
            <option className="bg-slate-950 text-white" value="PROCURING">Procuring</option>
          </select>
          
          <select 
            className="flex h-9 w-[180px] items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
          >
            <option className="bg-slate-950 text-white" value="created_at_desc">Newest First</option>
            <option className="bg-slate-950 text-white" value="created_at_asc">Oldest First</option>
            <option className="bg-slate-950 text-white" value="customer_name">Customer Name (A-Z)</option>
            <option className="bg-slate-950 text-white" value="status">Status</option>
          </select>
        </div>
      </div>

      <Card className="bg-card/50 backdrop-blur overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Lens Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Inventory</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.slice(0, 100).map(order => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">
                  <Link href={`/orders/${order.id}`} className="hover:underline text-primary">
                    {order.order_number}
                  </Link>
                </TableCell>
                <TableCell>{order.customer_name}</TableCell>
                <TableCell>{order.lens_type}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn("border-none", getStatusColor(order.current_status))}>
                    {order.current_status.replace(/_/g, " ")}
                  </Badge>
                </TableCell>
                <TableCell>
                  {order.inventory_available ? (
                    <span className="text-green-500 text-sm flex items-center"><div className="w-2 h-2 rounded-full bg-green-500 mr-2"/>Available</span>
                  ) : (
                    <span className="text-orange-500 text-sm flex items-center"><div className="w-2 h-2 rounded-full bg-orange-500 mr-2"/>Procuring</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {new Date(order.created_at).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
            {filteredOrders.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No orders match your filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
      {filteredOrders.length > 100 && (
        <div className="text-center text-sm text-muted-foreground">
          Showing 100 of {filteredOrders.length} orders.
        </div>
      )}
    </div>
  );
}

function ActivityIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  )
}
