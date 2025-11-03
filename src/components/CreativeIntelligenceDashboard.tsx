import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  TrendingUp,
  Calendar,
  Palette,
  Zap,
  Lightbulb,
  Info,
  BarChart3,
} from "lucide-react";
import { useCreativeIntelligence, TimeRange } from "@/hooks/useCreativeIntelligence";
import { LineChart, Line, ResponsiveContainer } from "recharts";

export const CreativeIntelligenceDashboard = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>(7);
  const { metrics, loading } = useCreativeIntelligence(timeRange);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2 justify-end">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">
            Start creating to see your creative intelligence insights!
          </p>
        </CardContent>
      </Card>
    );
  }

  const getEfficiencyColor = (score: number) => {
    if (score >= 70) return "text-green-600 dark:text-green-400";
    if (score >= 40) return "text-yellow-600 dark:text-yellow-400";
    return "text-orange-600 dark:text-orange-400";
  };

  const getEfficiencyLabel = (score: number) => {
    if (score >= 70) return "Excellent";
    if (score >= 40) return "Good";
    return "Developing";
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Time Range Filters */}
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            Creative Intelligence
          </h2>
          <Tabs
            value={timeRange.toString()}
            onValueChange={(v) => setTimeRange(parseInt(v) as TimeRange)}
          >
            <TabsList>
              <TabsTrigger value="7">7 Days</TabsTrigger>
              <TabsTrigger value="30">30 Days</TabsTrigger>
              <TabsTrigger value="90">90 Days</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Main Dashboard Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Style Analysis Card */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  Your Style DNA
                </CardTitle>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-4 h-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Analyzed from your prompts and generated images to identify
                      your most-used creative styles
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <CardDescription>Most used styles</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {metrics.topStyles.length > 0 ? (
                metrics.topStyles.map((style, index) => (
                  <div key={style.style} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium capitalize flex items-center gap-2">
                        <Badge
                          variant={index === 0 ? "default" : "secondary"}
                          className="w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs"
                        >
                          {index + 1}
                        </Badge>
                        {style.style}
                      </span>
                      <span className="text-muted-foreground">{style.percentage}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-500"
                        style={{ width: `${style.percentage}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Create more images to discover your style preferences
                </p>
              )}
            </CardContent>
          </Card>

          {/* Efficiency Metrics Card */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Efficiency Metrics
                </CardTitle>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-4 h-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Tracks your creative productivity and resource efficiency
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <CardDescription>Performance insights</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Efficiency Score with Sparkline */}
              <div className="space-y-2">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      Efficiency Score
                    </p>
                    <div className="flex items-baseline gap-2">
                      <p className={`text-3xl font-bold ${getEfficiencyColor(metrics.efficiencyScore)}`}>
                        {metrics.efficiencyScore}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {getEfficiencyLabel(metrics.efficiencyScore)}
                      </Badge>
                    </div>
                  </div>
                  <div className="h-12 w-24">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={metrics.dailyActivity.slice(-7)}>
                        <Line
                          type="monotone"
                          dataKey="count"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <BarChart3 className="w-3 h-3" />
                    Avg Iterations
                  </div>
                  <p className="text-xl font-bold">{metrics.averageIterations}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    Most Productive
                  </div>
                  <p className="text-xl font-bold">{metrics.mostProductiveDay}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Sparkles className="w-3 h-3" />
                    Images Created
                  </div>
                  <p className="text-xl font-bold">{metrics.totalImages}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <TrendingUp className="w-3 h-3" />
                    Credits/Image
                  </div>
                  <p className="text-xl font-bold">{metrics.creditsPerImage}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recommendations Card */}
          <Card className="overflow-hidden lg:col-span-1 md:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  Smart Recommendations
                </CardTitle>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-4 h-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      AI-powered suggestions based on your creative habits and usage
                      patterns
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <CardDescription>Personalized creative tips</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {metrics.recommendations.length > 0 ? (
                metrics.recommendations.map((recommendation, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-lg bg-muted/50 border border-border/50 hover:bg-muted transition-colors"
                  >
                    <p className="text-sm leading-relaxed">{recommendation}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Keep creating! Recommendations will appear based on your activity.
                </p>
              )}

              {metrics.totalImages > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    Based on {metrics.totalImages} images and {metrics.creditsUsed}{" "}
                    credits used in the last {timeRange} days
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Activity Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Activity Timeline</CardTitle>
            <CardDescription>
              Your creative output over the last {timeRange} days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-24">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics.dailyActivity}>
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))", r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
};
