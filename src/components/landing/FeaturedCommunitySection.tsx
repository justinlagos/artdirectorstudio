import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { Link } from "react-router-dom";

export const FeaturedCommunitySection = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["featured-community"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_posts")
        .select("id, image_url, likes_count, profiles!community_posts_user_id_fkey(username, email)")
        .order("likes_count", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(6);

      if (error) {
        console.error("[FeaturedCommunity] Query error:", error);
        return [];
      }
      
      return data || [];
    },
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading && !data) return null;
  if (!data || data.length === 0) return null;

  return (
    <section className="py-16 border-t border-border/60 bg-muted/20">
      <div className="max-w-6xl mx-auto px-4 md:px-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <h2 className="text-2xl md:text-3xl font-display font-bold">Featured Community Creations</h2>
            <p className="text-muted-foreground max-w-2xl">
              See what artists are sharing right now. Discover new ideas and jump into the conversation.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/community">View Community</Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((post: any) => (
            <Card key={post.id} className="overflow-hidden border-border/60">
              <div className="aspect-[4/3] overflow-hidden bg-muted">
                <img
                  src={post.image_url}
                  alt={post.profiles?.username || "Community post"}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="p-4 flex items-center justify-between">
                <div className="font-medium">{post.profiles?.username || "Creator"}</div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Heart className="h-4 w-4" />
                  {post.likes_count}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
