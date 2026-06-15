"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Plus, Edit, AlertTriangle, PackageOpen, PackageX, Loader2, ArrowUpRight, ArrowRight, PackagePlus } from "lucide-react";
import { format } from "date-fns";
import { api } from "@/lib/api";

export default function InventoryPage() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [procurementQueue, setProcurementQueue] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [lensType, setLensType] = useState("all");
  const [coating, setCoating] = useState("all");
  const [stockStatus, setStockStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success'|'error'} | null>(null);

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [activeItem, setActiveItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [adjustAmount, setAdjustAmount] = useState(0);

  const queueRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invRes, statsRes, queueRes] = await Promise.all([
        fetch(api('/api/inventory')),
        fetch(api('/api/inventory/stats')),
        fetch(api('/api/inventory/procurement-queue'))
      ]);
      if (!invRes.ok || !statsRes.ok || !queueRes.ok) throw new Error("Failed to fetch");
      setInventory(await invRes.json());
      setStats(await statsRes.json());
      setProcurementQueue(await queueRes.json());
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const showToast = (message: string, type: 'success'|'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(api('/api/inventory'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sphere_power: parseFloat(formData.sphere_power),
          cylinder_power: formData.cylinder_power ? parseFloat(formData.cylinder_power) : null,
          axis: formData.axis ? parseInt(formData.axis) : null,
          lens_type: formData.lens_type,
          lens_index: formData.lens_index,
          coating: formData.coating,
          quantity: parseInt(formData.quantity) || 0,
          minimum_threshold: parseInt(formData.minimum_threshold) || 10,
          supplier_name: formData.supplier_name || null,
          store_id: 1 // Default store
        })
      });
      if (!res.ok) throw new Error("Failed to create");
      showToast("Inventory item created successfully.");
      setShowAddModal(false);
      fetchData();
    } catch (err) {
      showToast("Failed to create inventory item.", "error");
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(api(`/api/inventory/${activeItem.id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: parseInt(formData.quantity),
          minimum_threshold: parseInt(formData.minimum_threshold),
          supplier_name: formData.supplier_name,
        })
      });
      if (!res.ok) throw new Error("Failed to update");
      showToast("Inventory item updated successfully.");
      setShowEditModal(false);
      fetchData();
    } catch (err) {
      showToast("Failed to update inventory item.", "error");
    }
  };

  const handleAdjust = async (amount: number) => {
    try {
      const res = await fetch(api(`/api/inventory/${activeItem.id}/adjust`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      });
      if (!res.ok) throw new Error("Failed to adjust");
      showToast("Stock adjusted successfully.");
      setShowAdjustModal(false);
      fetchData();
    } catch (err) {
      showToast("Failed to adjust stock. Check if amount results in negative stock.", "error");
    }
  };

  const handleRestock = async (itemId: number) => {
    try {
      const res = await fetch(api(`/api/inventory/${itemId}/restock`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 20 })
      });
      if (!res.ok) throw new Error("Failed to restock");
      showToast("Inventory restocked (+20). Blocked orders released.", "success");
      fetchData();
    } catch (err) {
      showToast("Failed to restock inventory.", "error");
    }
  };

  const handleQueueRestock = async (order: any) => {
    // Find matching inventory item
    const power = order.left_eye_power || 0;
    const item = inventory.find(i => 
      i.lens_type === order.lens_type &&
      i.lens_index === order.lens_index &&
      i.coating === order.coating &&
      i.sphere_power === power
    );

    if (item) {
      handleRestock(item.id);
    } else {
      try {
        const res = await fetch(api('/api/inventory'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sphere_power: power,
            lens_type: order.lens_type,
            lens_index: order.lens_index,
            coating: order.coating,
            quantity: 0,
            minimum_threshold: 10,
            store_id: 1
          })
        });
        if (!res.ok) throw new Error("Failed to create item");
        const createdItem = await res.json();
        
        // Now call the proper restock endpoint to trigger auto-release logic and refresh
        handleRestock(createdItem.id);


      } catch (err) {
        showToast("Failed to restock.", "error");
      }
    }
  };

  const scrollToQueue = () => {
    queueRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const filtered = inventory.filter(item => {
    const matchesSearch = item.lens_type.toLowerCase().includes(search.toLowerCase()) || item.coating.toLowerCase().includes(search.toLowerCase());
    const matchesType = lensType === "all" || item.lens_type === lensType;
    const matchesCoating = coating === "all" || item.coating === coating;
    
    let matchesStock = true;
    if (stockStatus === "in_stock") matchesStock = item.quantity > item.minimum_threshold;
    if (stockStatus === "low_stock") matchesStock = item.quantity > 0 && item.quantity <= item.minimum_threshold;
    if (stockStatus === "out_of_stock") matchesStock = item.quantity === 0;

    return matchesSearch && matchesType && matchesCoating && matchesStock;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Lens Inventory</h2>
          <p className="text-muted-foreground mt-2">Manage your current stock levels, procurements, and queue.</p>
        </div>
        <div className="flex gap-4">
          <Button onClick={() => { setFormData({lens_type: 'Single Vision', lens_index: '1.50', coating: 'Anti Glare', quantity: 0, minimum_threshold: 10}); setShowAddModal(true); }} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" /> Add Inventory
          </Button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Inventory Units</CardTitle>
              <PackageOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_items}</div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 backdrop-blur border-yellow-500/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">{stats.low_stock_items}</div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 backdrop-blur border-red-500/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Out Of Stock</CardTitle>
              <PackageX className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{stats.out_of_stock_items}</div>
            </CardContent>
          </Card>
          <Card 
            className="bg-cyan-950/20 backdrop-blur border-cyan-500/50 cursor-pointer hover:bg-cyan-900/30 transition-colors shadow-[0_0_15px_rgba(6,182,212,0.15)]"
            onClick={scrollToQueue}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-cyan-500">Orders Waiting</CardTitle>
              <Loader2 className="h-4 w-4 text-cyan-500 animate-spin" />
            </CardHeader>
            <CardContent className="flex justify-between items-end">
              <div className="text-2xl font-black text-cyan-500">{stats.orders_waiting_procurement || 0}</div>
              <ArrowRight className="h-4 w-4 text-cyan-500/50" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* PROCUREMENT QUEUE */}
      <div ref={queueRef}>
        <Card className="bg-card/50 backdrop-blur border-cyan-500/30 shadow-lg">
          <CardHeader className="border-b border-white/5 bg-cyan-950/10">
            <CardTitle className="flex items-center text-cyan-500">
              <AlertTriangle className="w-5 h-5 mr-2" /> 
              Procurement Queue
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading queue...</div>
            ) : procurementQueue.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No orders waiting for procurement.</div>
            ) : (
              <Table>
                <TableHeader className="bg-black/20">
                  <TableRow>
                    <TableHead>Order Number</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Lens Type</TableHead>
                    <TableHead>Power (SPH)</TableHead>
                    <TableHead>Index</TableHead>
                    <TableHead>Coating</TableHead>
                    <TableHead>Waiting Since</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {procurementQueue.map((order) => (
                    <TableRow key={order.id} className="hover:bg-white/5 transition-colors">
                      <TableCell className="font-medium">{order.order_number}</TableCell>
                      <TableCell>{order.customer_name}</TableCell>
                      <TableCell>{order.lens_type}</TableCell>
                      <TableCell>{order.left_eye_power > 0 ? `+${order.left_eye_power.toFixed(2)}` : order.left_eye_power?.toFixed(2) || '0.00'}</TableCell>
                      <TableCell>{order.lens_index}</TableCell>
                      <TableCell>{order.coating}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(order.created_at), 'MMM d, HH:mm')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          size="sm" 
                          className="bg-cyan-600 hover:bg-cyan-700 text-white"
                          onClick={() => handleQueueRestock(order)}
                        >
                          <PackagePlus className="w-4 h-4 mr-2" /> Restock Inventory
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* INVENTORY TABLE */}
      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardHeader className="flex flex-col space-y-4">
          <div className="flex flex-row items-center justify-between">
            <CardTitle>Current Stock</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search lens type..."
                className="pl-8 bg-background/50 border-border/50"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-4 pt-2">
            <select 
              className="flex h-9 w-[180px] items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={lensType}
              onChange={(e) => setLensType(e.target.value)}
            >
              <option className="bg-slate-950 text-white" value="all">All Lens Types</option>
              <option className="bg-slate-950 text-white" value="Single Vision">Single Vision</option>
              <option className="bg-slate-950 text-white" value="Progressive">Progressive</option>
              <option className="bg-slate-950 text-white" value="Bifocal">Bifocal</option>
            </select>
            <select 
              className="flex h-9 w-[180px] items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={coating}
              onChange={(e) => setCoating(e.target.value)}
            >
              <option className="bg-slate-950 text-white" value="all">All Coatings</option>
              <option className="bg-slate-950 text-white" value="Blue Cut">Blue Cut</option>
              <option className="bg-slate-950 text-white" value="Anti Glare">Anti Glare</option>
              <option className="bg-slate-950 text-white" value="UV Protection">UV Protection</option>
              <option className="bg-slate-950 text-white" value="Photochromic">Photochromic</option>
            </select>
            <select 
              className="flex h-9 w-[180px] items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={stockStatus}
              onChange={(e) => setStockStatus(e.target.value)}
            >
              <option className="bg-slate-950 text-white" value="all">All Stock Status</option>
              <option className="bg-slate-950 text-white" value="in_stock">In Stock</option>
              <option className="bg-slate-950 text-white" value="low_stock">Low Stock</option>
              <option className="bg-slate-950 text-white" value="out_of_stock">Out of Stock</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border/50 overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Lens Type</TableHead>
                  <TableHead>Power (SPH)</TableHead>
                  <TableHead>Index</TableHead>
                  <TableHead>Coating</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Loading inventory...</TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-destructive">Failed to load inventory data.</TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">No lenses found.</TableCell>
                  </TableRow>
                ) : (
                  filtered.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium">{item.lens_type}</TableCell>
                      <TableCell>{item.sphere_power > 0 ? `+${item.sphere_power.toFixed(2)}` : item.sphere_power.toFixed(2)}</TableCell>
                      <TableCell>{item.lens_index}</TableCell>
                      <TableCell>{item.coating}</TableCell>
                      <TableCell className="text-right font-medium">{item.quantity}</TableCell>
                      <TableCell>
                        {item.quantity === 0 ? (
                          <Badge variant="destructive" className="bg-destructive/20 text-destructive border-destructive/20 hover:bg-destructive/30">Out of Stock</Badge>
                        ) : item.quantity <= item.minimum_threshold ? (
                          <Badge variant="outline" className="bg-yellow-500/20 text-yellow-500 border-yellow-500/20">Low Stock</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-emerald-500/20 text-emerald-500 border-emerald-500/20">In Stock</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right flex justify-end gap-2">
                        {item.quantity === 0 && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="bg-cyan-500/10 text-cyan-500 hover:bg-cyan-500/20 border-cyan-500/20 mr-2"
                            onClick={() => handleRestock(item.id)}
                          >
                            <PackagePlus className="w-3 h-3 mr-1" /> Restock
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          size="icon-xs"
                          onClick={() => { setActiveItem(item); setFormData(item); setShowEditModal(true); }}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon-xs"
                          className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20"
                          onClick={() => { setActiveItem(item); setShowAdjustModal(true); }}
                        >
                          <ArrowUpRight className="w-3 h-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 p-4 rounded-xl shadow-2xl border flex items-center z-50 animate-in slide-in-from-bottom-5 ${
          toast.type === 'error' ? 'bg-red-950/80 border-red-500/50 text-red-200' : 'bg-green-950/80 border-green-500/50 text-green-200'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Add Inventory Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-background border border-border p-6 rounded-xl w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-4">Add Inventory Item</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Lens Type</label>
                  <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" required
                    value={formData.lens_type} onChange={e => setFormData({...formData, lens_type: e.target.value})}>
                    <option className="bg-slate-950" value="Single Vision">Single Vision</option>
                    <option className="bg-slate-950" value="Progressive">Progressive</option>
                    <option className="bg-slate-950" value="Bifocal">Bifocal</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Power (SPH)</label>
                  <Input type="number" step="0.25" required placeholder="-2.00" value={formData.sphere_power || ''} onChange={e => setFormData({...formData, sphere_power: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Index</label>
                  <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" required
                    value={formData.lens_index} onChange={e => setFormData({...formData, lens_index: e.target.value})}>
                    <option className="bg-slate-950" value="1.50">1.50</option>
                    <option className="bg-slate-950" value="1.56">1.56</option>
                    <option className="bg-slate-950" value="1.60">1.60</option>
                    <option className="bg-slate-950" value="1.61">1.61</option>
                    <option className="bg-slate-950" value="1.67">1.67</option>
                    <option className="bg-slate-950" value="1.74">1.74</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Coating</label>
                  <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" required
                    value={formData.coating} onChange={e => setFormData({...formData, coating: e.target.value})}>
                    <option className="bg-slate-950" value="None">None</option>
                    <option className="bg-slate-950" value="Anti Glare">Anti Glare</option>
                    <option className="bg-slate-950" value="Blue Cut">Blue Cut</option>
                    <option className="bg-slate-950" value="UV Protection">UV Protection</option>
                    <option className="bg-slate-950" value="Photochromic">Photochromic</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Quantity</label>
                  <Input type="number" required placeholder="0" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Min Threshold</label>
                  <Input type="number" required placeholder="10" value={formData.minimum_threshold} onChange={e => setFormData({...formData, minimum_threshold: e.target.value})} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-border/50 mt-4">
                <Button variant="ghost" type="button" onClick={() => setShowAddModal(false)}>Cancel</Button>
                <Button type="submit">Create Item</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Inventory Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-background border border-border p-6 rounded-xl w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-4">Edit Inventory Item</h3>
            <p className="text-sm text-muted-foreground mb-4">Updating configuration for {activeItem?.lens_type} ({activeItem?.sphere_power})</p>
            <form onSubmit={handleEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Quantity</label>
                  <Input type="number" required placeholder="0" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Min Threshold</label>
                  <Input type="number" required placeholder="10" value={formData.minimum_threshold} onChange={e => setFormData({...formData, minimum_threshold: e.target.value})} />
                </div>
                <div className="col-span-2 space-y-2">
                  <label className="text-sm font-medium">Supplier Name</label>
                  <Input type="text" placeholder="Optical Corp" value={formData.supplier_name || ''} onChange={e => setFormData({...formData, supplier_name: e.target.value})} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-border/50 mt-4">
                <Button variant="ghost" type="button" onClick={() => setShowEditModal(false)}>Cancel</Button>
                <Button type="submit">Save Changes</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-background border border-border p-6 rounded-xl w-full max-w-sm shadow-2xl">
            <h3 className="text-xl font-bold mb-4">Adjust Stock</h3>
            <p className="text-sm text-muted-foreground mb-4">Current Stock: <span className="font-bold text-foreground">{activeItem?.quantity}</span></p>
            <div className="grid grid-cols-4 gap-2 mb-4">
              <Button variant="outline" className="text-green-500 border-green-500/20" onClick={() => handleAdjust(10)}>+10</Button>
              <Button variant="outline" className="text-green-500 border-green-500/20" onClick={() => handleAdjust(20)}>+20</Button>
              <Button variant="outline" className="text-green-500 border-green-500/20" onClick={() => handleAdjust(50)}>+50</Button>
              <Button variant="outline" className="text-red-500 border-red-500/20" onClick={() => handleAdjust(-10)} disabled={activeItem?.quantity < 10}>-10</Button>
            </div>
            <div className="flex gap-2">
              <Input type="number" placeholder="Custom amount..." value={adjustAmount || ''} onChange={e => setAdjustAmount(parseInt(e.target.value))} />
              <Button onClick={() => handleAdjust(adjustAmount)}>Adjust</Button>
            </div>
            <div className="flex justify-end pt-4 mt-4 border-t border-border/50">
              <Button variant="ghost" type="button" onClick={() => setShowAdjustModal(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
