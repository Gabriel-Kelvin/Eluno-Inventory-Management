"use client";

import { useMemo } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type InventoryItem = {
  lens_type: string;
  coating: string;
  quantity: number;
};

type OrderItem = {
  current_status: string;
};

interface DashboardChartsProps {
  inventory: InventoryItem[];
  orders: OrderItem[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export function DashboardCharts({ inventory, orders }: DashboardChartsProps) {
  // Aggregate Inventory by Lens Type
  const lensTypeData = useMemo(() => {
    const counts: Record<string, number> = {};
    inventory.forEach(item => {
      counts[item.lens_type] = (counts[item.lens_type] || 0) + item.quantity;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [inventory]);

  // Aggregate Inventory by Coating
  const coatingData = useMemo(() => {
    const counts: Record<string, number> = {};
    inventory.forEach(item => {
      counts[item.coating] = (counts[item.coating] || 0) + item.quantity;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [inventory]);

  // Aggregate Orders by Status
  const orderStatusData = useMemo(() => {
    const counts: Record<string, number> = {};
    const activeOrders = orders.filter(o => o.current_status !== "DELIVERED");
    activeOrders.forEach(order => {
      const status = order.current_status.replace(/_/g, " ");
      counts[status] = (counts[status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [orders]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      <Card className="bg-card/50 backdrop-blur border-border/50 shadow-lg col-span-1">
        <CardHeader>
          <CardTitle className="text-lg">Inventory by Lens Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={lensTypeData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis dataKey="name" stroke="#888" tick={{ fill: '#888' }} axisLine={false} tickLine={false} />
                <YAxis stroke="#888" tick={{ fill: '#888' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0B1120', borderColor: '#1f2937', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/50 backdrop-blur border-border/50 shadow-lg col-span-1">
        <CardHeader>
          <CardTitle className="text-lg">Inventory by Coating</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={coatingData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {coatingData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0B1120', borderColor: '#1f2937', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ paddingTop: '20px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/50 backdrop-blur border-border/50 shadow-lg lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg">Active Orders Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={orderStatusData} layout="vertical" margin={{ top: 10, right: 30, left: 40, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={true} vertical={false} />
                <XAxis type="number" stroke="#888" tick={{ fill: '#888' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" stroke="#888" tick={{ fill: '#888', fontSize: 12 }} axisLine={false} tickLine={false} width={150} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0B1120', borderColor: '#1f2937', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
