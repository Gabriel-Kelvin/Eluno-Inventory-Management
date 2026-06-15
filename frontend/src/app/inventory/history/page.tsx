"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function InventoryHistoryPage() {
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch('http://localhost:8000/api/inventory/history');
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setMovements(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, []);

  const getBadgeColor = (type: string) => {
    switch(type) {
      case "IN": return "bg-emerald-500/20 text-emerald-500 border-emerald-500/20";
      case "OUT": return "bg-destructive/20 text-destructive border-destructive/20";
      case "PROCUREMENT_RECEIVED": return "bg-blue-500/20 text-blue-500 border-blue-500/20";
      case "MANUAL_ADJUSTMENT": return "bg-orange-500/20 text-orange-500 border-orange-500/20";
      case "ORDER_ALLOCATION": return "bg-purple-500/20 text-purple-500 border-purple-500/20";
      default: return "bg-muted text-foreground border-border";
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Link href="/inventory" className="p-2 hover:bg-white/5 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Inventory Movement History</h2>
          <p className="text-muted-foreground mt-2">Audit log of all stock adjustments and procurement events.</p>
        </div>
      </div>

      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardHeader>
          <CardTitle>Movement Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border/50 overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Movement Type</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Reason / Notes</TableHead>
                  <TableHead>Inventory ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">Loading history...</TableCell>
                  </TableRow>
                ) : movements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">No movements recorded.</TableCell>
                  </TableRow>
                ) : (
                  movements.map((movement) => (
                    <TableRow key={movement.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium">{format(new Date(movement.created_at), 'MMM d, yyyy HH:mm:ss')}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getBadgeColor(movement.movement_type)}>
                          {movement.movement_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        <span className={movement.movement_type === 'OUT' || movement.movement_type === 'ORDER_ALLOCATION' || movement.quantity < 0 ? "text-red-500" : "text-green-500"}>
                          {movement.quantity > 0 && movement.movement_type !== 'OUT' && movement.movement_type !== 'ORDER_ALLOCATION' ? '+' : ''}{movement.quantity}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{movement.notes || "-"}</TableCell>
                      <TableCell>Item #{movement.inventory_id}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
