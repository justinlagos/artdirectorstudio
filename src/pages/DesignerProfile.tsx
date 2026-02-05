import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Mail, Briefcase, Trophy, Heart, Eye, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CaseStudyList } from '@/components/showcase/CaseStudyList';
import { PortfolioGrid } from '@/components/showcase/PortfolioGrid';

interface DesignerProfile {
  user_id: string;
  username: string;
  avatar_url?: string;
  bio?: string;
  specialties: string[];
  industries: string[];
  featured_works: string[];
  available_for_work: boolean;
  hourly_rate?: number;
  total_generations: number;
  community_likes: number;
  followers: number;
}

export const DesignerProfile = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<DesignerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    if (username) {
      loadProfile();
    }
  }, [username]);

  useEffect(() => {
    if (profile && user) {
      checkFollowStatus();
    }
  }, [profile, user]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('designer_profiles')
        .select('*')
        .eq('username', username)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Profile not found');
      navigate('/community');
    } finally {
      setLoading(false);
    }
  };

  const checkFollowStatus = async () => {
    if (!user || !profile) return;

    try {
      const { data, error } = await supabase
        .from('designer_follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', profile.user_id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      setIsFollowing(!!data);
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  };

  const handleFollow = async () => {
    if (!user) {
      toast.error('Please sign in to follow designers');
      return;
    }

    if (!profile) return;

    setFollowLoading(true);
    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('designer_follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', profile.user_id);

        if (error) throw error;
        setIsFollowing(false);
        setProfile(prev => prev ? { ...prev, followers: Math.max(0, prev.followers - 1) } : null);
        toast.success('Unfollowed');
      } else {
        // Follow
        const { error } = await supabase
          .from('designer_follows')
          .insert({
            follower_id: user.id,
            following_id: profile.user_id,
          });

        if (error) throw error;
        setIsFollowing(true);
        setProfile(prev => prev ? { ...prev, followers: prev.followers + 1 } : null);
        toast.success('Following');
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      toast.error('Failed to update follow status');
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading profile...</p>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  const isOwnProfile = user?.id === profile.user_id;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Profile Header */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-start gap-6">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.username}
                  className="h-24 w-24 rounded-full border-2 border-primary"
                />
              ) : (
                <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary">
                  <User className="h-12 w-12 text-primary" />
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-3xl font-bold mb-2">{profile.username}</h1>
                    {profile.bio && (
                      <p className="text-muted-foreground mb-4">{profile.bio}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Trophy className="h-4 w-4" />
                        {profile.total_generations} generations
                      </div>
                      <div className="flex items-center gap-1">
                        <Heart className="h-4 w-4" />
                        {profile.community_likes} likes
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        {profile.followers} followers
                      </div>
                    </div>
                  </div>
                  {!isOwnProfile && (
                    <Button 
                      onClick={handleFollow} 
                      variant={isFollowing ? 'outline' : 'default'}
                      disabled={followLoading}
                    >
                      {followLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
                    </Button>
                  )}
                </div>
                {(profile.specialties.length > 0 || profile.industries.length > 0) && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {profile.specialties.map((specialty) => (
                      <Badge key={specialty} variant="secondary">
                        {specialty}
                      </Badge>
                    ))}
                    {profile.industries.map((industry) => (
                      <Badge key={industry} variant="outline">
                        {industry}
                      </Badge>
                    ))}
                  </div>
                )}
                {profile.available_for_work && (
                  <div className="mt-4">
                    <Badge variant="default" className="gap-2">
                      <Briefcase className="h-3 w-3" />
                      Available for work
                      {profile.hourly_rate && ` • $${profile.hourly_rate}/hr`}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="case-studies" className="space-y-4">
          <TabsList>
            <TabsTrigger value="case-studies">Case Studies</TabsTrigger>
            <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
          </TabsList>

          <TabsContent value="case-studies">
            <CaseStudyList userId={profile.user_id} />
          </TabsContent>

          <TabsContent value="portfolio">
            <PortfolioGrid userId={profile.user_id} />
          </TabsContent>

          <TabsContent value="about">
            <Card>
              <CardHeader>
                <CardTitle>About</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {profile.bio || 'No bio available.'}
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
};
