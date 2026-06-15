"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, CheckCircle2, Clock, AlertCircle, XCircle, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

const VALID_TRANSITIONS: Record<string, { label: string, next: string }[]> = {
  "PLACED": [{ label: "Move To Prescription Verification", next: "PRESCRIPTION_VERIFICATION" }],
  "PRESCRIPTION_VERIFICATION": [{ label: "Move To Lens Allocation", next: "LENS_ALLOCATION" }],
  "LENS_ALLOCATION": [{ label: "Move To Lab Processing", next: "LAB_PROCESSING" }],
  "LAB_PROCESSING": [{ label: "Move To Coating", next: "COATING" }],
  "COATING": [{ label: "Move To Quality Check", next: "QUALITY_CHECK" }],
  "QUALITY_CHECK": [], // Handled separately by QC buttons
  "PACKAGING": [{ label: "Move To Shipping", next: "SHIPPING" }],
  "SHIPPING": [{ label: "Move To Delivered", next: "DELIVERED" }],
  "REWORK_REQUIRED": [{ label: "Restart Manufacturing", next: "LAB_PROCESSING" }],
  "DELIVERED": []
};

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id;
  
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [delayReason, setDelayReason] = useState("");
  const [toastMsg, setToastMsg] = useState<{title: string, desc?: string, type: 'success'|'error'} | null>(null);

  const showToast = (title: string, desc?: string, type: 'success'|'error' = 'success') => {
    setToastMsg({ title, desc, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const fetchOrder = () => {
    setLoading(true);
    fetch(api(`/api/orders/${orderId}`))
      .then(res => res.json())
      .then(data => {
        setOrder(data);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const handleUpdateStatus = async (nextStatus: string, actionLabel: string) => {
    setUpdating(true);
    try {
      const response = await fetch(api(`/api/orders/${orderId}/status`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_status: nextStatus,
          changed_by: "System UI",
          delay_reason: delayReason || null
        })
      });

      if (!response.ok) {
        const err = await response.json();
        showToast("Invalid workflow transition.", err.detail || "Error", "error");
      } else {
        showToast(actionLabel === "Restart Manufacturing" ? "Manufacturing restarted." : "Status updated successfully.");
        setDelayReason("");
        fetchOrder();
        router.refresh();
      }
    } catch (e: any) {
      showToast("Invalid workflow transition.", e.message, "error");
    }
    setUpdating(false);
  };

  const handleQC = async (result: "PASS" | "FAIL") => {
    let reason = null;
    if (result === "FAIL") {
      reason = prompt("Enter reason for QC failure (e.g. Scratched lens):");
      if (!reason) return; // cancelled
    }
    
    setUpdating(true);
    try {
      const response = await fetch(api(`/api/orders/${orderId}/qc`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          result: result,
          failure_reason: reason
        })
      });
      
      if (!response.ok) {
        const err = await response.json();
        showToast("Invalid workflow transition.", err.detail || "Error", "error");
      } else {
        showToast(result === "PASS" ? "QC passed." : "QC failed.", undefined, result === "PASS" ? "success" : "error");
        fetchOrder();
        router.refresh();
      }
    } catch (e: any) {
      showToast("Invalid workflow transition.", e.message, "error");
    }
    setUpdating(false);
  };



  const getTimelineColor = (status: string) => {
    if (status === "DELIVERED") return "bg-green-500";
    if (status === "REWORK_REQUIRED") return "bg-red-500";
    if (status === "LAB_PROCESSING" || status === "COATING") return "bg-orange-500";
    return "bg-blue-500";
  };

  if (loading && !order) return <div className="p-8 text-center animate-pulse">Loading order details...</div>;
  if (!order) return <div className="p-8 text-center text-red-500">Order not found.</div>;

  const validActions = VALID_TRANSITIONS[order.current_status] || [];

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto animate-in fade-in duration-500 relative">
      {/* Toast Notification */}
      {toastMsg && (
        <div className={cn(
          "fixed bottom-8 right-8 z-50 p-4 rounded-lg shadow-xl border flex items-center gap-3 animate-in slide-in-from-bottom-5",
          toastMsg.type === 'success' ? "bg-card border-green-500/20" : "bg-card border-red-500/20"
        )}>
          {toastMsg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          ) : (
            <XCircle className="w-5 h-5 text-red-500" />
          )}
          <div>
            <p className="text-sm font-medium">{toastMsg.title}</p>
            {toastMsg.desc && <p className="text-xs text-muted-foreground">{toastMsg.desc}</p>}
          </div>
        </div>
      )}

      <div>
        <Link href="/orders" className="flex items-center text-sm text-muted-foreground hover:text-primary mb-4 transition-colors">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Orders
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{order.order_number}</h2>
            <p className="text-muted-foreground mt-1">Customer: <span className="font-medium text-foreground">{order.customer_name}</span></p>
          </div>
          <Badge variant="outline" className="text-lg px-4 py-1 bg-primary/10 text-primary border-none">
            {order.current_status.replace(/_/g, " ")}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-2 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle>Prescription & Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-y-4 gap-x-8">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Lens Type</p>
              <p className="font-medium">{order.lens_type}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Index & Coating</p>
              <p className="font-medium">{order.lens_index} - {order.coating}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Left Eye Power</p>
              <p className="font-medium font-mono bg-muted inline-block px-2 py-0.5 rounded text-primary">
                {order.left_eye_power > 0 ? "+" : ""}{order.left_eye_power.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Right Eye Power</p>
              <p className="font-medium font-mono bg-muted inline-block px-2 py-0.5 rounded text-primary">
                {order.right_eye_power > 0 ? "+" : ""}{order.right_eye_power.toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle>Fulfillment Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Inventory</p>
              {(order.inventory_available || ["LAB_PROCESSING", "COATING", "QUALITY_CHECK", "REWORK_REQUIRED", "PACKAGING", "SHIPPING", "DELIVERED"].includes(order.current_status)) ? (
                <span className="text-green-500 font-medium flex items-center"><CheckCircle2 className="w-4 h-4 mr-2"/> Allocated</span>
              ) : (
                <span className="text-orange-500 font-medium flex items-center"><Clock className="w-4 h-4 mr-2"/> Procuring</span>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Created At</p>
              <p className="font-medium">{new Date(order.created_at).toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {order.current_status !== "DELIVERED" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-card/50 backdrop-blur border-primary/20">
            <CardHeader>
              <CardTitle>Manufacturing Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {validActions.length > 0 ? (
                <>
                  {validActions.map(action => (
                    <Button 
                      key={action.next}
                      className={cn("w-full", action.next === "LAB_PROCESSING" ? "bg-orange-600 hover:bg-orange-700 text-white" : "")}
                      onClick={() => handleUpdateStatus(action.next, action.label)} 
                      disabled={updating}
                    >
                      {updating ? "Updating..." : action.label}
                    </Button>
                  ))}
                  <Input 
                    placeholder="Optional: Reason for delay..." 
                    value={delayReason}
                    onChange={e => setDelayReason(e.target.value)}
                    disabled={updating}
                  />
                </>
              ) : order.current_status === "QUALITY_CHECK" ? (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Action required in Quality Control panel.
                </p>
              ) : order.current_status === "WAITING_FOR_PROCUREMENT" ? (
                <p className="text-sm text-amber-500 text-center py-2 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 mr-2" /> Action required in Procurement panel.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">
                  No further manufacturing steps available.
                </p>
              )}
            </CardContent>
          </Card>

          {order.current_status === "WAITING_FOR_PROCUREMENT" && (
            <Card className="bg-amber-950/20 backdrop-blur border-amber-500/50 md:col-span-2 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
              <CardHeader>
                <CardTitle className="flex items-center text-amber-500">
                  <AlertTriangle className="w-5 h-5 mr-2" /> 
                  Inventory Procurement Required
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-black/40 rounded-lg p-4 flex flex-col md:flex-row justify-between items-center border border-amber-500/20">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Required Lens Details</p>
                    <p className="font-semibold">{order.lens_type} | Index: {order.lens_index} | Coating: {order.coating}</p>
                    <p className="text-sm text-muted-foreground mt-1">SPH: {order.left_eye_power > 0 ? `+${order.left_eye_power.toFixed(2)}` : order.left_eye_power?.toFixed(2) || '0.00'}</p>
                  </div>
                  <div className="mt-4 md:mt-0 flex gap-4 text-center">
                    <div className="bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
                      <p className="text-xs text-amber-500 uppercase tracking-wider mb-1">Current Stock</p>
                      <p className="text-2xl font-black text-amber-500">0</p>
                    </div>
                  </div>
                </div>
                <Link href="/inventory" className="w-full block">
                  <Button 
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-6 text-lg"
                  >
                    Manage Procurement in Inventory Dashboard
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {order.current_status === "QUALITY_CHECK" ? (
            <Card className="bg-card/50 backdrop-blur border-orange-500/50">
              <CardHeader>
                <CardTitle>Quality Control</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <Button 
                  variant="default" 
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => handleQC("PASS")}
                  disabled={updating}
                >
                  PASS QC
                </Button>
                <Button 
                  variant="destructive" 
                  className="w-full"
                  onClick={() => handleQC("FAIL")}
                  disabled={updating}
                >
                  FAIL QC
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-card/50 backdrop-blur opacity-50">
              <CardHeader>
                <CardTitle>Quality Control</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center py-4">QC controls are only available when the order is in the QUALITY_CHECK stage.</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Card className="bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle>Status Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative border-l border-muted ml-3 space-y-6">
            {order.status_history.map((hist: any) => {
              const colorClass = getTimelineColor(hist.new_status);
              return (
                <div key={hist.id} className="relative pl-6">
                  <div className={cn(
                    "absolute -left-1.5 top-1.5 w-3 h-3 rounded-full border-2 border-background",
                    colorClass
                  )} />
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
                    <div>
                      <h4 className={cn("font-medium", 
                        hist.new_status === "REWORK_REQUIRED" && "text-red-500",
                        hist.new_status === "DELIVERED" && "text-green-500"
                      )}>
                        {hist.new_status.replace(/_/g, " ")}
                      </h4>
                      {hist.delay_reason && (
                        <p className="text-sm text-muted-foreground flex items-center mt-1">
                          <AlertCircle className="w-3 h-3 mr-1 text-red-500"/>
                          {hist.delay_reason}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(hist.changed_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
