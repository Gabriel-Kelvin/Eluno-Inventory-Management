"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Save, Mail, AlertCircle, Loader2 } from "lucide-react";

export default function SettingsPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success'|'error'} | null>(null);

  useEffect(() => {
    fetch('http://localhost:8000/api/settings/ALERT_EMAIL')
      .then(res => res.json())
      .then(data => {
        if (data && data.value) {
          setEmail(data.value);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load settings:", err);
        setLoading(false);
      });
  }, []);

  const showToast = (message: string, type: 'success'|'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('http://localhost:8000/api/settings/ALERT_EMAIL', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: email })
      });
      if (!res.ok) throw new Error("Failed to save settings");
      showToast("Alert recipient updated successfully!");
    } catch (err) {
      showToast("Failed to save settings.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">System Settings</h2>
          <p className="text-muted-foreground mt-2">Configure platform-wide preferences and notification routing.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-card/50 backdrop-blur border-border/50 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-primary" />
              Alert Configuration
            </CardTitle>
            <CardDescription>
              Set the primary recipient for automated operations alerts, including SLA breaches, procurement delays, and QC failures.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center text-muted-foreground py-4">
                <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading settings...
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-6">
                <div className="space-y-3">
                  <label className="text-sm font-medium">Alert Recipient Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <Input 
                      type="email" 
                      placeholder="ops-team@eluno.com" 
                      className="pl-10 bg-background/50 border-border/50 h-11"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This email will receive automated priority alerts from the Eluno Background Monitor. Max 1 email per order per alert type every 24 hours.
                  </p>
                </div>
                <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Configuration
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 p-4 rounded-xl shadow-2xl border flex items-center z-50 animate-in slide-in-from-bottom-5 ${
          toast.type === 'error' ? 'bg-red-950/80 border-red-500/50 text-red-200' : 'bg-green-950/80 border-green-500/50 text-green-200'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
