import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const useInspireSocial = (sharedAssetId: string) => {
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && sharedAssetId) {
      checkSocialStatus();
    }
  }, [user, sharedAssetId]);

  const checkSocialStatus = async () => {
    if (!user) return;

    try {
      // Check like status
      const { data: like } = await supabase
        .from("asset_likes")
        .select("id")
        .eq("user_id", user.id)
        .eq("shared_asset_id", sharedAssetId)
        .maybeSingle();

      setIsLiked(!!like);

      // Check bookmark status
      const { data: bookmark } = await supabase
        .from("asset_bookmarks")
        .select("id")
        .eq("user_id", user.id)
        .eq("shared_asset_id", sharedAssetId)
        .maybeSingle();

      setIsBookmarked(!!bookmark);
    } catch (error) {
      console.error("Error checking social status:", error);
    }
  };

  const toggleLike = async () => {
    if (!user) {
      toast.error("Please sign in to like");
      return;
    }

    setLoading(true);
    try {
      if (isLiked) {
        // Unlike
        await supabase
          .from("asset_likes")
          .delete()
          .eq("user_id", user.id)
          .eq("shared_asset_id", sharedAssetId);
        setIsLiked(false);
      } else {
        // Like
        await supabase
          .from("asset_likes")
          .insert({
            user_id: user.id,
            shared_asset_id: sharedAssetId,
          });
        setIsLiked(true);
        toast.success("Added to likes");
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      toast.error("Failed to update like");
    } finally {
      setLoading(false);
    }
  };

  const toggleBookmark = async () => {
    if (!user) {
      toast.error("Please sign in to bookmark");
      return;
    }

    setLoading(true);
    try {
      if (isBookmarked) {
        // Remove bookmark
        await supabase
          .from("asset_bookmarks")
          .delete()
          .eq("user_id", user.id)
          .eq("shared_asset_id", sharedAssetId);
        setIsBookmarked(false);
      } else {
        // Add bookmark
        await supabase
          .from("asset_bookmarks")
          .insert({
            user_id: user.id,
            shared_asset_id: sharedAssetId,
          });
        setIsBookmarked(true);
        toast.success("Added to bookmarks");
      }
    } catch (error) {
      console.error("Error toggling bookmark:", error);
      toast.error("Failed to update bookmark");
    } finally {
      setLoading(false);
    }
  };

  const toggleFollow = async (creatorId: string) => {
    if (!user) {
      toast.error("Please sign in to follow");
      return;
    }

    setLoading(true);
    try {
      if (isFollowing) {
        // Unfollow
        await supabase
          .from("user_follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", creatorId);
        setIsFollowing(false);
      } else {
        // Follow
        await supabase
          .from("user_follows")
          .insert({
            follower_id: user.id,
            following_id: creatorId,
          });
        setIsFollowing(true);
        toast.success("Now following");
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
      toast.error("Failed to update follow");
    } finally {
      setLoading(false);
    }
  };

  return {
    isLiked,
    isBookmarked,
    isFollowing,
    loading,
    toggleLike,
    toggleBookmark,
    toggleFollow,
  };
};
