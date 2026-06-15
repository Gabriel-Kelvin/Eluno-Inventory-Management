"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function CreateOrderPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    customer_name: "",
    store_id: "1",
    lens_type: "Single Vision",
    lens_index: "1.50",
    coating: "None",
    left_eye_power: "0.00",
    right_eye_power: "0.00"
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer_name) {
      setError("Customer name is required.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const response = await fetch("http://localhost:8000/api/orders/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: formData.customer_name,
          store_id: parseInt(formData.store_id),
          frame_name: "Customer Frame",
          lens_type: formData.lens_type,
          lens_index: formData.lens_index,
          coating: formData.coating,
          left_eye_power: parseFloat(formData.left_eye_power),
          right_eye_power: parseFloat(formData.right_eye_power)
        })
      });

      if (!response.ok) throw new Error("Failed to create order");
      
      const data = await response.json();
      router.push(`/orders/${data.id}`);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-3xl mx-auto animate-in fade-in duration-500">
      <div>
        <Link href="/orders" className="flex items-center text-sm text-muted-foreground hover:text-primary mb-4 transition-colors">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Orders
        </Link>
        <h2 className="text-3xl font-bold tracking-tight">Create New Order</h2>
        <p className="text-muted-foreground mt-1">Submit a new optical order into the workflow.</p>
      </div>

      <Card className="bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle>Order Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && <div className="p-3 bg-red-500/10 text-red-500 rounded-md text-sm">{error}</div>}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Customer Name</label>
                <Input 
                  name="customer_name" 
                  placeholder="John Doe" 
                  value={formData.customer_name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Store</label>
                <select 
                  name="store_id"
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  value={formData.store_id}
                  onChange={handleChange}
                >
                  <option className="bg-slate-950" value="1">Store 1 - Downtown</option>
                  <option className="bg-slate-950" value="2">Store 2 - Uptown</option>
                  <option className="bg-slate-950" value="3">Store 3 - Suburb</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Lens Type</label>
                <select 
                  name="lens_type"
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  value={formData.lens_type}
                  onChange={handleChange}
                >
                  <option className="bg-slate-950" value="Single Vision">Single Vision</option>
                  <option className="bg-slate-950" value="Bifocal">Bifocal</option>
                  <option className="bg-slate-950" value="Progressive">Progressive</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Lens Index</label>
                <select 
                  name="lens_index"
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  value={formData.lens_index}
                  onChange={handleChange}
                >
                  <option className="bg-slate-950" value="1.50">1.50</option>
                  <option className="bg-slate-950" value="1.56">1.56</option>
                  <option className="bg-slate-950" value="1.60">1.60</option>
                  <option className="bg-slate-950" value="1.67">1.67</option>
                  <option className="bg-slate-950" value="1.74">1.74</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Coating</label>
                <select 
                  name="coating"
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  value={formData.coating}
                  onChange={handleChange}
                >
                  <option className="bg-slate-950" value="None">None</option>
                  <option className="bg-slate-950" value="Anti Glare">Anti Glare</option>
                  <option className="bg-slate-950" value="Blue Cut">Blue Cut</option>
                  <option className="bg-slate-950" value="UV Protection">UV Protection</option>
                  <option className="bg-slate-950" value="Photochromic">Photochromic</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Left Eye Power (SPH)</label>
                <Input 
                  name="left_eye_power" 
                  type="number" 
                  step="0.25"
                  value={formData.left_eye_power}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Right Eye Power (SPH)</label>
                <Input 
                  name="right_eye_power" 
                  type="number" 
                  step="0.25"
                  value={formData.right_eye_power}
                  onChange={handleChange}
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Processing..." : "Create Order & Check Inventory"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
