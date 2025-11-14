import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { Copy, Check, Share2, Eye, Download } from "lucide-react";
import { FaXTwitter, FaLinkedin, FaPinterest } from "react-icons/fa6";
import { analytics } from "@/lib/analytics";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetId: string;
  assetType: string;
}

export const ShareDialog = ({ open, onOpenChange, assetId, assetType }: ShareDialogProps) => {
  const isMobile = useIsMobile();
  const [isPublic, setIsPublic] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareData, setShareData] = useState<{ id: string; view_count: number } | null>(null);

  const generateShareToken = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const handleCreateShare = async () => {
    setIsSharing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to share");
        return;
      }

      // Check if share already exists
      const { data: existingShare } = await supabase
        .from("shared_assets")
        .select("*")
        .eq("asset_id", assetId)
        .eq("user_id", user.id)
        .single();

      let shareToken: string;
      let shareId: string;
      let viewCount: number;

      if (existingShare) {
        // Update existing share
        const { data, error } = await supabase
          .from("shared_assets")
          .update({ is_public: isPublic })
          .eq("id", existingShare.id)
          .select()
          .single();

        if (error) throw error;
        shareToken = data.share_token;
        shareId = data.id;
        viewCount = data.view_count;
        toast.success("Share settings updated");
      } else {
        // Create new share
        shareToken = generateShareToken();
        const { data, error } = await supabase
          .from("shared_assets")
          .insert({
            asset_id: assetId,
            user_id: user.id,
            share_token: shareToken,
            is_public: isPublic,
          })
          .select()
          .single();

        if (error) throw error;
        shareId = data.id;
        viewCount = data.view_count;
        toast.success("Share link created");
      }

      const url = `${window.location.origin}/shared/${shareToken}`;
      setShareUrl(url);
      setShareData({ id: shareId, view_count: viewCount });
      
      // Track share creation
      analytics.track("Asset Shared", {
        tool: "share",
        action: "share",
        asset_type: assetType,
        is_public: isPublic,
        success: true,
      });
    } catch (error) {
      console.error("Error creating share:", error);
      analytics.track("Asset Shared", {
        tool: "share",
        action: "share",
        asset_type: assetType,
        is_public: isPublic,
        success: false,
        error_type: error instanceof Error ? error.message.substring(0, 50) : "unknown",
      });
      toast.error("Failed to create share link");
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  const handleShareToX = () => {
    const text = `Check out my ${assetType} created with ArtDirector Studio`;
    const url = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleShareToLinkedIn = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleShareToPinterest = () => {
    const url = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(shareUrl)}&description=${encodeURIComponent(`Created with ArtDirector Studio`)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleDownload = async () => {
    try {
      const { data: asset } = await supabase
        .from("generated_assets")
        .select("image_url, prompt")
        .eq("id", assetId)
        .single();

      if (!asset?.image_url) {
        toast.error("No image to download");
        return;
      }

      // Fetch with CORS handling and proper blob response
      const response = await fetch(asset.image_url, {
        mode: 'cors',
        cache: 'no-cache'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch image');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `artdirector-${assetType}-${Date.now()}.png`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      setTimeout(() => {
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      }, 100);
      
      // Track export/download
      analytics.track("Asset Exported", {
        tool: "export",
        action: "download",
        asset_type: assetType,
        success: true,
      });
      
      toast.success("Image downloaded");
    } catch (error) {
      console.error("Download error:", error);
      analytics.track("Asset Exported", {
        tool: "export",
        action: "download",
        asset_type: assetType,
        success: false,
        error_type: error instanceof Error ? error.message.substring(0, 50) : "unknown",
      });
      toast.error("Failed to download image");
    }
  };

  const content = (
    <div className="space-y-4">
      <div className="p-4 rounded-lg bg-muted/30 space-y-3">
        <div className="flex items-start gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Share2 className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium">How sharing works</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Generate a unique link to share your work. Toggle "Make Public" to also display it in the Inspire gallery where everyone can discover it.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between space-x-2 p-3 rounded-lg border border-border/50 hover:border-border transition-colors min-h-[44px]">
        <div className="flex-1">
          <Label htmlFor="public-toggle" className="text-sm font-medium cursor-pointer">
            Make Public
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isPublic ? "Visible in Inspire gallery" : "Share link only"}
          </p>
        </div>
        <Switch
          id="public-toggle"
          checked={isPublic}
          onCheckedChange={setIsPublic}
        />
      </div>

      {!shareUrl ? (
        <Button onClick={handleCreateShare} disabled={isSharing} className="w-full min-h-[44px]">
          {isSharing ? "Creating..." : "Create Share Link"}
        </Button>
      ) : (
        <>
          <div className="space-y-2">
            <Label htmlFor="share-url">Share Link</Label>
            <div className="flex gap-2">
              <Input
                id="share-url"
                value={shareUrl}
                readOnly
                className="flex-1 min-h-[44px]"
              />
              <Button
                size="icon"
                variant="outline"
                onClick={handleCopyLink}
                className="min-w-[44px] min-h-[44px]"
              >
                {copied ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <Copy className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>

          {shareData && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Eye className="h-4 w-4" />
              <span>{shareData.view_count} views</span>
            </div>
          )}

          <div className="space-y-3 pt-2">
            <Label className="text-sm font-medium">Share on Social Media</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={handleShareToX}
                variant="outline"
                className="min-h-[44px] gap-2"
              >
                <FaXTwitter className="h-4 w-4" />
                X (Twitter)
              </Button>
              <Button
                onClick={handleShareToLinkedIn}
                variant="outline"
                className="min-h-[44px] gap-2"
              >
                <FaLinkedin className="h-4 w-4" />
                LinkedIn
              </Button>
              <Button
                onClick={handleShareToPinterest}
                variant="outline"
                className="min-h-[44px] gap-2"
              >
                <FaPinterest className="h-4 w-4" />
                Pinterest
              </Button>
              <Button
                onClick={handleDownload}
                variant="outline"
                className="min-h-[44px] gap-2"
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
            </div>
          </div>

          <Button
            onClick={handleCreateShare}
            disabled={isSharing}
            variant="outline"
            className="w-full min-h-[44px]"
          >
            {isSharing ? "Updating..." : "Update Share Settings"}
          </Button>
        </>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90dvh] overflow-y-auto">
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Share {assetType}
            </DrawerTitle>
            <DrawerDescription>
              Create a shareable link for this {assetType.toLowerCase()}
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share {assetType}
          </DialogTitle>
          <DialogDescription>
            Create a shareable link for this {assetType.toLowerCase()}
          </DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
};
