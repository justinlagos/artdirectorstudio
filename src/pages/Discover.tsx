import { useState, useEffect } from 'react';
import { Search, Filter, User, Briefcase } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

interface DesignerCard {
  user_id: string;
  username: string;
  avatar_url?: string;
  bio?: string;
  specialties: string[];
  industries: string[];
  available_for_work: boolean;
  total_generations: number;
  community_likes: number;
  followers: number;
}

export const Discover = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState<string>('all');
  const [industryFilter, setIndustryFilter] = useState<string>('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('most_liked');
  const [designers, setDesigners] = useState<DesignerCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDesigners();
  }, [searchQuery, specialtyFilter, industryFilter, availabilityFilter, sortBy]);

  const loadDesigners = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('designer_profiles')
        .select('*');

      // Apply filters
      if (searchQuery) {
        query = query.or(`username.ilike.%${searchQuery}%,bio.ilike.%${searchQuery}%`);
      }

      if (specialtyFilter !== 'all') {
        query = query.contains('specialties', [specialtyFilter]);
      }

      if (industryFilter !== 'all') {
        query = query.contains('industries', [industryFilter]);
      }

      if (availabilityFilter === 'available') {
        query = query.eq('available_for_work', true);
      }

      // Apply sorting
      if (sortBy === 'most_liked') {
        query = query.order('community_likes', { ascending: false });
      } else if (sortBy === 'most_active') {
        query = query.order('total_generations', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;
      setDesigners(data || []);
    } catch (error) {
      console.error('Error loading designers:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUniqueValues = (field: 'specialties' | 'industries'): string[] => {
    const values = new Set<string>();
    designers.forEach(d => {
      d[field].forEach(v => values.add(v));
    });
    return Array.from(values).sort();
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Discover Designers</h1>
          <p className="text-muted-foreground">
            Explore portfolios and find talented designers
          </p>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4 mb-8">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search designers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="most_liked">Most Liked</SelectItem>
                <SelectItem value="most_active">Most Active</SelectItem>
                <SelectItem value="recent">Recent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-4">
            <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Specialty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Specialties</SelectItem>
                {getUniqueValues('specialties').map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={industryFilter} onValueChange={setIndustryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Industry" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Industries</SelectItem>
                {getUniqueValues('industries').map(i => (
                  <SelectItem key={i} value={i}>{i}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Availability" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="available">Available for Work</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Designer Grid */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading designers...</p>
          </div>
        ) : designers.length === 0 ? (
          <div className="text-center py-12">
            <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No designers found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {designers.map((designer) => (
              <Card
                key={designer.user_id}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => navigate(`/designer/${designer.username}`)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4 mb-4">
                    {designer.avatar_url ? (
                      <img
                        src={designer.avatar_url}
                        alt={designer.username}
                        className="h-16 w-16 rounded-full"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-8 w-8 text-primary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg truncate">{designer.username}</h3>
                      {designer.bio && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {designer.bio}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {designer.specialties.slice(0, 3).map(s => (
                      <Badge key={s} variant="secondary" className="text-xs">
                        {s}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{designer.total_generations} works</span>
                    <span>{designer.community_likes} likes</span>
                    {designer.available_for_work && (
                      <Badge variant="outline" className="text-xs">
                        <Briefcase className="h-3 w-3 mr-1" />
                        Available
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};
