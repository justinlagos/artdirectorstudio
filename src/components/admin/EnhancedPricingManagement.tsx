import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type PricingConfig = Database['public']['Tables']['pricing_config']['Row'];

export const EnhancedPricingManagement = () => {
  const [pricingConfigs, setPricingConfigs] = useState<PricingConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);

  useEffect(() => {
    fetchPricingConfigs();
  }, []);

  const fetchPricingConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from('pricing_config')
        .select('*')
        .order('action');

      if (error) throw error;
      setPricingConfigs(data || []);
    } catch (error) {
      console.error("Error fetching pricing configs:", error);
      toast.error("Failed to load pricing configurations");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (config: PricingConfig) => {
    setEditingId(config.id);
    setEditValue(config.credits);
  };

  const handleSave = async (id: string) => {
    try {
      const { error } = await supabase
        .from('pricing_config')
        .update({ credits: editValue })
        .eq('id', id);

      if (error) throw error;
      
      toast.success("Pricing updated successfully");
      setEditingId(null);
      fetchPricingConfigs();
    } catch (error) {
      console.error("Error updating pricing:", error);
      toast.error("Failed to update pricing");
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('pricing_config')
        .update({ active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      
      toast.success(`Package ${!currentStatus ? 'enabled' : 'disabled'} successfully`);
      fetchPricingConfigs();
    } catch (error) {
      console.error("Error toggling package status:", error);
      toast.error("Failed to update package status");
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValue(0);
  };

  if (loading) {
    return <div>Loading pricing configurations...</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Enhanced Credit Pricing Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {pricingConfigs.map((config) => (
              <div
                key={config.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium capitalize">
                      {config.action.replace('_', ' ')}
                    </p>
                    <Badge variant={config.active ? "default" : "secondary"}>
                      {config.active ? "Active" : "Disabled"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Provider: {config.provider}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  {editingId === config.id ? (
                    <>
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`credits-${config.id}`}>Credits:</Label>
                        <Input
                          id={`credits-${config.id}`}
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(parseInt(e.target.value))}
                          className="w-24"
                          min={0}
                        />
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleSave(config.id)}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancel}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="font-semibold">
                        {config.credits} credits
                      </span>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={config.active}
                          onCheckedChange={() => handleToggleActive(config.id, config.active)}
                        />
                        <Label>Active</Label>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(config)}
                      >
                        Edit
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};