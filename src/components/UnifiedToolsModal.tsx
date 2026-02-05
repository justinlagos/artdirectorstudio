import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToolsModal } from "@/contexts/ToolsModalContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Layers, Maximize2, ImageIcon, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ImageBlendDialog } from "./ImageBlendDialog";
import { ImageUpscaleDialog } from "./ImageUpscaleDialog";
import { CampaignBuilder } from "./campaign/CampaignBuilder";
// Batch feature temporarily disabled
// import { BatchProcessDialog } from "./BatchProcessDialog";

export const UnifiedToolsModal = () => {
  const { isOpen, activeTool, closeTool } = useToolsModal();

  return (
    <>
      <ImageBlendDialog
        open={activeTool === "blend"}
        onOpenChange={(open) => !open && closeTool()}
      />
      <ImageUpscaleDialog
        open={activeTool === "upscale"}
        onOpenChange={(open) => !open && closeTool()}
      />
      <Dialog open={activeTool === "campaign"} onOpenChange={(open) => !open && closeTool()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Campaign Builder</DialogTitle>
            <DialogDescription>
              Generate coordinated assets for multiple formats in one operation
            </DialogDescription>
          </DialogHeader>
          <CampaignBuilder />
        </DialogContent>
      </Dialog>
      {/* Batch feature temporarily disabled */}
      {/* <BatchProcessDialog
        open={activeTool === "batch"}
        onOpenChange={(open) => !open && closeTool()}
      /> */}
    </>
  );
};
