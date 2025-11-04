import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy, Check, Share2, Eye } from "lucide-react";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetId: string;
  assetType: string;
}

export const ShareDialog = ({ open, onOpenChange, assetId, assetType }: ShareDialogProps) => {
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
    } catch (error) {
      console.error("Error creating share:", error);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-4 sm:p-6 max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Share2 className="h-5 w-5" />
            Share {assetType}
          </DialogTitle>
          <DialogDescription className="text-sm">
            Create a shareable link for this {assetType.toLowerCase()}
          </DialogDescription>
        </DialogHeader>

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

          <div className="flex items-center justify-between space-x-2 p-3 rounded-lg border border-border/50 hover:border-border transition-colors">
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
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
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
      </DialogContent>
    </Dialog>
  );
};
