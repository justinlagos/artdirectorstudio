import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  ImageIcon,
  Sparkles,
  Upload,
  TrendingUp,
  Coins,
  Eye,
  CheckCircle2,
  Clock3,
  ArrowUpRight,
  ChevronRight,
  Palette,
  Layers
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";

interface AnalyticsData {
  totalAssets: number;
  totalImages: number;
  totalAnalyses: number;
  totalPrompts: number;
  totalShares: number;
  totalViews: number;
  creditsUsed: number;
  creditsRemaining: number;
  assetsByType: Array<{ name: string; value: number }>;
  activityByDay: Array<{ date: string; count: number }>;
  recentActivity: Array<{ type: string; created_at: string }>;
}

export const UserAnalytics = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all generated assets
      const { data: assets } = await supabase
        .from("generated_assets")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      // Fetch shared assets stats
      const { data: shares } = await supabase
        .from("shared_assets")
        .select("view_count")
        .eq("user_id", user.id);

      // Fetch credits
      const { data: credits } = await supabase
        .from("credits")
        .select("balance")
        .eq("user_id", user.id)
        .single();

      // Fetch credit transactions
      const { data: transactions } = await supabase
        .from("credit_transactions")
        .select("amount, action")
        .eq("user_id", user.id);

      const totalImages = assets?.filter(a => a.type === "image").length || 0;
      const totalAnalyses = assets?.filter(a => a.type === "analysis").length || 0;
      const totalPrompts = assets?.filter(a => a.type === "prompt").length || 0;
      
      const totalViews = shares?.reduce((sum, s) => sum + s.view_count, 0) || 0;
      
      const creditsSpent = transactions
        ?.filter(t => t.amount < 0)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;

      // Group assets by type for pie chart
      const assetsByType = [
        { name: "Images", value: totalImages },
        { name: "Analyses", value: totalAnalyses },
        { name: "Prompts", value: totalPrompts },
      ].filter(item => item.value > 0);

      // Activity by day (last 7 days)
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toISOString().split("T")[0];
      }).reverse();

      const activityByDay = last7Days.map(date => ({
        date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        count: assets?.filter(a => a.created_at.startsWith(date)).length || 0,
      }));

      setAnalytics({
        totalAssets: assets?.length || 0,
        totalImages,
        totalAnalyses,
        totalPrompts,
        totalShares: shares?.length || 0,
        totalViews,
        creditsUsed: creditsSpent,
        creditsRemaining: credits?.balance || 0,
        assetsByType,
        activityByDay,
        recentActivity: assets?.slice(0, 5).map(a => ({
          type: a.type,
          created_at: a.created_at,
        })) || [],
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!analytics) {
    return <div>Failed to load analytics</div>;
  }

  const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))"];

  const weeklyTotal = analytics.activityByDay.reduce((sum, d) => sum + d.count, 0);
  const recentKeywords = ["Typography", "Sepia tone", "Distressed paper", "Vintage cut-outs", "Calm contrast"];
  const variationNotes = [
    {
      title: "Gallery grade",
      status: "Pinned",
      description: "Soft highlight over typographic texture for museum signage",
      tone: "text-emerald-600 bg-emerald-50"
    },
    {
      title: "Warm contrast",
      status: "Saved",
      description: "Deeper copper undertones to emphasize dimensional letters",
      tone: "text-amber-600 bg-amber-50"
    },
    {
      title: "Minimal frame",
      status: "Idea",
      description: "Clean border and tighter spacing for storefront poster",
      tone: "text-sky-600 bg-sky-50"
    }
  ];

  return (
    <div className="space-y-8">
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-primary/5 via-background to-background">
          <div className="relative grid gap-6 p-6 lg:p-10 lg:grid-cols-[1fr_340px] items-start">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=80')] opacity-10 bg-cover" />
            <div className="absolute inset-0 bg-gradient-to-br from-background/90 via-background/80 to-background" />
            <div className="relative space-y-6">
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="rounded-full">Studio</Badge>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Ready for review
                </div>
                <span className="h-1 w-1 rounded-full bg-muted-foreground/50" aria-hidden="true" />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Sparkles className="h-4 w-4" />
                  Momentum: {weeklyTotal} this week
                </div>
              </div>

              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-xl space-y-3">
                  <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">Your visual analysis hub</h2>
                  <p className="text-muted-foreground text-lg leading-relaxed">
                    Keep your current project, creative prompts, and visual diagnostics in one place. The layout below mirrors the sample studio view with rich highlights, momentum, and prompt history.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Badge className="rounded-full" variant="outline">{analytics.totalAssets} total assets</Badge>
                    <Badge className="rounded-full" variant="outline">{analytics.totalShares} shares</Badge>
                    <Badge className="rounded-full" variant="outline">{analytics.totalViews} views</Badge>
                  </div>
                </div>
                <Button size="lg" className="gap-2">
                  Generate now
                  <ArrowUpRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border bg-white/30 backdrop-blur p-4 shadow-sm">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    Current stage <ChevronRight className="h-4 w-4" />
                  </div>
                  <p className="text-lg font-semibold mt-2">Design refinements</p>
                  <p className="text-sm text-muted-foreground">Iteration focus over next 3 days</p>
                </div>
                <div className="rounded-2xl border bg-white/30 backdrop-blur p-4 shadow-sm">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    Next review <ChevronRight className="h-4 w-4" />
                  </div>
                  <p className="text-lg font-semibold mt-2">Monday, 5:00 PM EST</p>
                  <p className="text-sm text-muted-foreground">Sync with art director</p>
                </div>
                <div className="rounded-2xl border bg-white/30 backdrop-blur p-4 shadow-sm">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    Credits <ChevronRight className="h-4 w-4" />
                  </div>
                  <p className="text-lg font-semibold mt-2">{analytics.creditsRemaining} remaining</p>
                  <p className="text-sm text-muted-foreground">{analytics.creditsUsed} used this month</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Progress toward delivery</span>
                  <span className="text-foreground">76%</span>
                </div>
                <Progress value={76} className="h-2" />
                <p className="text-xs text-muted-foreground">Anchored to your weekly activity and asset approvals.</p>
              </div>
            </div>

            <Card className="relative border-0 shadow-xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
              <div className="relative p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="rounded-full">Pinned inspiration</Badge>
                  <div className="text-xs text-muted-foreground flex items-center gap-2"><Eye className="h-3.5 w-3.5" /> {analytics.totalViews} views</div>
                </div>
                <div className="rounded-xl bg-[url('https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=80')] bg-cover bg-center h-56 shadow-inner" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Latest activity</p>
                    <p className="font-semibold">{analytics.recentActivity[0]?.type ?? "Image"} • {analytics.recentActivity[0]?.created_at?.split("T")[0]}</p>
                  </div>
                  <Button variant="secondary" className="gap-2">
                    Export assets
                    <Upload className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Momentum snapshot</CardTitle>
                <Badge variant="secondary" className="rounded-full">+24% vs last week</Badge>
              </div>
              <CardDescription>Weekly creation pace and approvals</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border p-3 bg-gradient-to-br from-primary/5 to-background">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    Output
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <p className="text-2xl font-semibold">{weeklyTotal}</p>
                  <p className="text-xs text-muted-foreground">Assets generated in 7 days</p>
                </div>
                <div className="rounded-xl border p-3 bg-gradient-to-br from-secondary/10 to-background">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    Shares
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <p className="text-2xl font-semibold">{analytics.totalShares}</p>
                  <p className="text-xs text-muted-foreground">{analytics.totalViews} combined views</p>
                </div>
              </div>

              <Separator />
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10 text-primary"><Coins className="h-4 w-4" /></div>
                  <div>
                    <p className="text-sm font-medium">Credits</p>
                    <p className="text-xs text-muted-foreground">{analytics.creditsRemaining} remaining • {analytics.creditsUsed} used</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 className="h-4 w-4" /></div>
                  <div>
                    <p className="text-sm font-medium">Approval ready</p>
                    <p className="text-xs text-muted-foreground">{analytics.recentActivity.length} assets awaiting your review</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-amber-50 text-amber-600"><Clock3 className="h-4 w-4" /></div>
                  <div>
                    <p className="text-sm font-medium">Last sync</p>
                    <p className="text-xs text-muted-foreground">Updated {analytics.activityByDay[analytics.activityByDay.length - 1].date}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Distribution</CardTitle>
              <CardDescription>Balance of your generated content</CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <ChartContainer
                config={{
                  value: {
                    label: "Count",
                  },
                }}
                className="h-[220px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.assetsByType}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100 || 0).toFixed(0)}%`}
                      outerRadius={80}
                      fill="hsl(var(--primary))"
                      dataKey="value"
                    >
                      {analytics.assetsByType.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-xl">Visual analysis</CardTitle>
              <CardDescription>Key cues, keywords, and diagnostic notes</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="rounded-full flex items-center gap-1"><Palette className="h-3.5 w-3.5" /> Palette</Badge>
              <Badge variant="outline" className="rounded-full flex items-center gap-1"><Layers className="h-3.5 w-3.5" /> Composition</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap gap-2">
              {recentKeywords.map(keyword => (
                <Badge key={keyword} variant="secondary" className="rounded-full">{keyword}</Badge>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border p-4 bg-muted/30">
                <p className="text-sm text-muted-foreground">Image quality</p>
                <p className="text-lg font-semibold">4.8</p>
                <p className="text-xs text-muted-foreground">High clarity on distressed paper texture</p>
              </div>
              <div className="rounded-xl border p-4 bg-muted/30">
                <p className="text-sm text-muted-foreground">Render depth</p>
                <p className="text-lg font-semibold">4.2</p>
                <p className="text-xs text-muted-foreground">Strong shadow play and dimensional type</p>
              </div>
              <div className="rounded-xl border p-4 bg-muted/30">
                <p className="text-sm text-muted-foreground">Shadow shape</p>
                <p className="text-lg font-semibold">A+</p>
                <p className="text-xs text-muted-foreground">Consistent light source across layers</p>
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-primary/10 text-primary"><ImageIcon className="h-5 w-5" /></div>
                  <div>
                    <p className="font-medium">Project notes</p>
                    <p className="text-sm text-muted-foreground">Keep typography crisp while keeping organic imperfections.</p>
                  </div>
                </div>
                <div className="rounded-xl border p-4 space-y-2">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    Weekly output
                    <span className="text-foreground font-semibold">{weeklyTotal} assets</span>
                  </div>
                  <Progress value={Math.min(100, weeklyTotal * 10)} className="h-2" />
                  <p className="text-xs text-muted-foreground">Pacing up +12% from last week.</p>
                </div>
              </div>

              <div className="rounded-xl border p-4 space-y-3 bg-muted/20">
                <div className="flex items-center justify-between">
                  <p className="font-medium">Upcoming checks</p>
                  <Badge variant="outline" className="rounded-full">Timeline</Badge>
                </div>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-primary" /> Push final proof to gallery wall</div>
                  <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Prepare window poster variant</div>
                  <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-amber-500" /> Capture nighttime reference photo</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">Full generation prompt</CardTitle>
              <Badge variant="secondary" className="rounded-full">ArtFlow Studio</Badge>
            </div>
            <CardDescription>Mirror the sample prompt editing surface for quick tweaks.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
              <p className="text-sm text-muted-foreground">Primary prompt</p>
              <p className="text-base leading-relaxed">
                Distressed newspaper typography collage, bold headline energy, layered paper fragments, soft sepia warmth, calming museum lighting. Hand-crafted edges with subtle shadow falloff and brushed texture variations.
              </p>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="rounded-full">Use typography</Badge>
                <Badge variant="outline" className="rounded-full">Detailed design</Badge>
                <Badge variant="outline" className="rounded-full">High quality rendering</Badge>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary" /> Generation complete — ready to save variations
              </div>
              <div className="grid gap-3">
                {variationNotes.map(note => (
                  <div key={note.title} className="rounded-xl border p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{note.title}</p>
                      <Badge className={`rounded-full ${note.tone}`}>{note.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{note.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <Button className="w-full" variant="secondary">
              Save variation set
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Activity over time</CardTitle>
                <CardDescription>Your asset creation in the last 7 days</CardDescription>
              </div>
              <Badge variant="outline" className="rounded-full flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5" /> Trending</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <ChartContainer
              config={{
                count: {
                  label: "Assets",
                  color: "hsl(var(--primary))",
                },
              }}
              className="h-[260px] w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.activityByDay} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    className="text-[10px] sm:text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    className="text-[10px] sm:text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    width={30}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))', r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>Fast overview of the latest saves and shares</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {analytics.recentActivity.length === 0 && (
              <p className="text-sm text-muted-foreground">No recent items yet. Generate or analyze an asset to see it here.</p>
            )}
            {analytics.recentActivity.map((activity, index) => (
              <div key={`${activity.created_at}-${index}`} className="flex items-start gap-3 rounded-xl border p-3">
                <div className="p-2 rounded-full bg-primary/10 text-primary">
                  {activity.type === "image" ? <ImageIcon className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                </div>
                <div className="flex-1">
                  <p className="font-medium capitalize">{activity.type}</p>
                  <p className="text-xs text-muted-foreground">{new Date(activity.created_at).toLocaleString()}</p>
                </div>
                <Button size="sm" variant="ghost" className="gap-1">
                  View
                  <ArrowUpRight className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
