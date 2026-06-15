import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Package, AlertTriangle, CheckCircle, TrendingUp } from "lucide-react";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";

export const revalidate = 0; // Dynamic page

async function getDashboardData() {
  try {
    const [statsRes, inventoryRes, ordersRes] = await Promise.all([
      fetch('http://localhost:8000/api/inventory/stats', { cache: 'no-store' }),
      fetch('http://localhost:8000/api/inventory', { cache: 'no-store' }),
      fetch('http://localhost:8000/api/orders', { cache: 'no-store' })
    ]);

    if (!statsRes.ok || !inventoryRes.ok || !ordersRes.ok) {
      throw new Error("Failed to fetch dashboard data");
    }

    const stats = await statsRes.json();
    const inventory = await inventoryRes.json();
    const orders = await ordersRes.json();

    return { stats, inventory, orders };
  } catch (error) {
    return null;
  }
}

export default async function Dashboard() {
  const data = await getDashboardData();
  
  if (!data) {
    return (
      <div className="flex h-[50vh] items-center justify-center flex-col gap-4">
        <AlertTriangle className="h-10 w-10 text-destructive" />
        <h2 className="text-xl font-semibold">Failed to load dashboard data</h2>
        <p className="text-muted-foreground text-sm">Please ensure the FastAPI backend is running on port 8000.</p>
      </div>
    );
  }

  const { stats, inventory, orders } = data;
  const { total_items, low_stock_items, out_of_stock_items, health_score, most_demanded_type } = stats;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Inventory Intelligence</h2>
        <p className="text-muted-foreground mt-2">
          Real-time overview of your eyewear components and stock health.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
        <Card className="bg-card/50 backdrop-blur border-primary/20 shadow-lg shadow-primary/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Inventory</CardTitle>
            <Package className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total_items}</div>
            <p className="text-xs text-muted-foreground mt-1">Lenses across all stores</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur border-yellow-500/20 shadow-lg shadow-yellow-500/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{low_stock_items}</div>
            <p className="text-xs text-muted-foreground mt-1">Require procurement soon</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur border-destructive/20 shadow-lg shadow-destructive/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{out_of_stock_items}</div>
            <p className="text-xs text-muted-foreground mt-1">Immediate action required</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur border-emerald-500/20 shadow-lg shadow-emerald-500/5 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Health Score</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <div className="text-2xl font-bold text-emerald-500">{health_score}</div>
              <span className="text-sm text-muted-foreground mb-1">/ 100</span>
            </div>
            <Progress value={health_score} className="mt-3 h-1.5" />
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur border-blue-500/20 shadow-lg shadow-blue-500/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Demand</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-blue-500">{most_demanded_type || "N/A"}</div>
            <p className="text-xs text-muted-foreground mt-1">Based on recent forecasts</p>
          </CardContent>
        </Card>
      </div>

      <DashboardCharts inventory={inventory} orders={orders} />
    </div>
  );
}
