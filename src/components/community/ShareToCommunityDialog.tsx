import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Loader2, Send } from "lucide-react";

interface ShareToCommunityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl?: string | null;
  defaultCaption?: string;
  defaultTitle?: string;
  onShared?: (postId: string) => void;
}

export const ShareToCommunityDialog = ({
  open,
  onOpenChange,
  imageUrl,
  defaultCaption,
  defaultTitle,
  onShared,
}: ShareToCommunityDialogProps) => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [caption, setCaption] = useState(defaultCaption || "");
  const [title, setTitle] = useState(defaultTitle || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setCaption(defaultCaption || "");
    setTitle(defaultTitle || "");
  }, [defaultCaption, defaultTitle, open]);

  const handleShare = async () => {
    if (!imageUrl) {
      toast.error("No image available to share");
      return;
    }

    if (!user) {
      toast.error("Please sign in to share with the community");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("community_posts")
        .insert({
          user_id: user.id,
          image_url: imageUrl,
          caption: caption?.trim() || title?.trim() || "Shared via ArtDirector Studio",
        })
        .select("id")
        .single();

      if (error) throw error;

      toast.success("Shared with the community!", {
        description: "View your post in the community feed.",
        action: {
          label: "View Community",
          onClick: () => {
            window.location.href = "/community";
          }
        }
      });

      if (data?.id) {
        onShared?.(data.id);
      }

      onOpenChange(false);
    } catch (error) {
      console.error("Failed to share to community", error);
      toast.error("Unable to share right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const content = (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="community-title">Title (optional)</Label>
        <Input
          id="community-title"
          placeholder="Give your creation a headline"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="community-caption">Caption</Label>
        <Textarea
          id="community-caption"
          placeholder="Tell the community about this image or the prompt behind it"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          className="min-h-[100px]"
        />
      </div>
      <div className="text-xs text-muted-foreground">
        Your image will be visible to everyone. Likes and comments require a logged-in account.
      </div>
      <Button onClick={handleShare} disabled={isSubmitting} className="w-full">
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Sharing...
          </>
        ) : (
          <>
            <Send className="w-4 h-4 mr-2" />
            Share to Community
          </>
        )}
      </Button>
      {!user && (
        <div className="text-xs text-muted-foreground text-center">
          You need an account to share. <Link to="/auth" className="text-primary">Sign in</Link> to publish your creations.
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="p-6 space-y-4">
          <DrawerHeader className="px-0 pt-0">
            <DrawerTitle>Share to Community</DrawerTitle>
            <DrawerDescription>Publish your image to the community feed.</DrawerDescription>
          </DrawerHeader>
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share to Community</DialogTitle>
          <DialogDescription>Publish your image to the community feed.</DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
};
