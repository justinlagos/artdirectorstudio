import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import { User, Shield, CreditCard, Settings2, Bell, Sparkles, Crown } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "next-themes";

const Settings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { subscription } = useSubscription();
  const [isLoading, setIsLoading] = useState(false);
  
  // Profile state
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [freeCredits, setFreeCredits] = useState(0);
  const [dailyUsage, setDailyUsage] = useState(0);
  const [dailyLimit, setDailyLimit] = useState(10);
  
  // Security state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  
  // Notifications state
  const [creditAlerts, setCreditAlerts] = useState(true);
  const [newFeatures, setNewFeatures] = useState(true);
  const [galleryUpdates, setGalleryUpdates] = useState(false);
  
  // Billing events
  const [billingEvents, setBillingEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    loadProfile();
    loadNotificationPreferences();
  }, [user, navigate]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username, bio, free_credits, daily_usage, daily_limit')
        .eq('id', user?.id)
        .single();
      
      if (data) {
        setUsername(data.username || "");
        setBio(data.bio || "");
        setFreeCredits(data.free_credits || 0);
        setDailyUsage(data.daily_usage || 0);
        setDailyLimit(data.daily_limit || 10);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  };

  const loadNotificationPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('credit_alerts, new_features, gallery_updates')
        .eq('user_id', user?.id)
        .single();
      
      if (data) {
        setCreditAlerts(data.credit_alerts ?? true);
        setNewFeatures(data.new_features ?? true);
        setGalleryUpdates(data.gallery_updates ?? false);
      }
    } catch (error) {
      console.error("Error loading preferences:", error);
    }
  };

  const loadBillingEvents = async () => {
    if (!user) return;
    
    setLoadingEvents(true);
    try {
      const { data, error } = await supabase
        .from('billing_events')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      setBillingEvents(data || []);
    } catch (error) {
      console.error("Error loading billing events:", error);
      toast.error("Failed to load billing history");
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username,
          bio,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
      
      if (error) throw error;
      toast.success("Profile updated successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast.error("Please fill in all password fields");
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
      
      setCurrentPassword("");
      setNewPassword("");
      toast.success("Password updated successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to update password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveNotifications = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          credit_alerts: creditAlerts,
          new_features: newFeatures,
          gallery_updates: galleryUpdates,
          updated_at: new Date().toISOString()
        });
      
      if (error) throw error;
      toast.success("Notification preferences saved");
    } catch (error: any) {
      toast.error(error.message || "Failed to save preferences");
    } finally {
      setIsLoading(false);
    }
  };

  const getTierDisplay = () => {
    const tier = subscription.tier || 'free';
    const tiers: Record<string, { name: string; icon: any; color: string }> = {
      free: { name: 'Free Trial', icon: Sparkles, color: 'text-muted-foreground' },
      starter: { name: 'Starter', icon: Crown, color: 'text-blue-500' },
      pro: { name: 'Pro', icon: Crown, color: 'text-primary' },
      enterprise: { name: 'Enterprise', icon: Crown, color: 'text-purple-500' },
    };
    return tiers[tier] || tiers.free;
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface-1">
      <Header />
      <main className="flex-1 container mx-auto px-6 py-12 max-w-6xl">
        <div className="space-y-8 animate-fade-in">
          <div>
            <h1 className="text-4xl font-display font-bold tracking-tight mb-2">Settings</h1>
            <p className="text-muted-foreground">Manage your account preferences and settings</p>
          </div>

          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="glass-strong overflow-x-auto flex-nowrap w-full justify-start">
              <TabsTrigger value="profile" className="gap-2 flex-shrink-0">
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Profile</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="gap-2 flex-shrink-0">
                <Shield className="w-4 h-4" />
                <span className="hidden sm:inline">Security</span>
              </TabsTrigger>
              <TabsTrigger value="billing" className="gap-2 flex-shrink-0">
                <CreditCard className="w-4 h-4" />
                <span className="hidden sm:inline">Plan & Billing</span>
              </TabsTrigger>
              <TabsTrigger value="preferences" className="gap-2 flex-shrink-0">
                <Settings2 className="w-4 h-4" />
                <span className="hidden sm:inline">Preferences</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="gap-2 flex-shrink-0">
                <Bell className="w-4 h-4" />
                <span className="hidden sm:inline">Notifications</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="mt-6">
              <Card className="glass">
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>Update your personal information and profile details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={user?.email || ""} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input 
                      id="username" 
                      placeholder="Enter username" 
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Input 
                      id="bio" 
                      placeholder="Tell us about yourself" 
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleSaveProfile} disabled={isLoading}>
                    {isLoading ? "Saving..." : "Save Changes"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security" className="mt-6">
              <Card className="glass">
                <CardHeader>
                  <CardTitle>Account & Security</CardTitle>
                  <CardDescription>Manage your password and security settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input 
                      id="current-password" 
                      type="password" 
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input 
                      id="new-password" 
                      type="password" 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password (min 6 characters)"
                    />
                  </div>
                  <Button onClick={handleChangePassword} disabled={isLoading}>
                    {isLoading ? "Updating..." : "Update Password"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="billing" className="mt-6" onFocus={loadBillingEvents}>
              <div className="space-y-6">
                {/* Current Plan */}
                <Card className="glass">
                  <CardHeader>
                    <CardTitle>Current Plan</CardTitle>
                    <CardDescription>Your subscription and usage information</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {(() => {
                      const tierInfo = getTierDisplay();
                      const TierIcon = tierInfo.icon;
                      return (
                        <div className="p-6 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                          <div className="flex items-center gap-3 mb-4">
                            <TierIcon className={`w-6 h-6 ${tierInfo.color}`} />
                            <div>
                              <p className="text-2xl font-bold">{tierInfo.name}</p>
                              {subscription.tier === 'free' && freeCredits > 0 && (
                                <p className="text-sm text-muted-foreground">{freeCredits} free credits remaining</p>
                              )}
                              {subscription.tier === 'starter' && (
                                <p className="text-sm text-muted-foreground">
                                  {dailyUsage} / {dailyLimit} generations used today
                                </p>
                              )}
                              {(subscription.tier === 'pro' || subscription.tier === 'enterprise') && (
                                <p className="text-sm text-muted-foreground">Unlimited generations</p>
                              )}
                            </div>
                          </div>
                          
                          {subscription.tier === 'free' ? (
                            <Button className="w-full" onClick={() => navigate('/subscriptions')}>
                              <Crown className="w-4 h-4 mr-2" />
                              Upgrade to Pro
                            </Button>
                          ) : (
                            <Button variant="outline" className="w-full" onClick={() => navigate('/subscriptions')}>
                              Manage Subscription
                            </Button>
                          )}
                        </div>
                      );
                    })()}

                    {/* Usage Stats */}
                    {subscription.tier !== 'free' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-lg bg-muted/30">
                          <p className="text-sm text-muted-foreground">Plan Status</p>
                          <p className="text-xl font-semibold">
                            {subscription.isPro ? 'Active' : 'Inactive'}
                          </p>
                        </div>
                        {subscription.expiresAt && (
                          <div className="p-4 rounded-lg bg-muted/30">
                            <p className="text-sm text-muted-foreground">Renews On</p>
                            <p className="text-xl font-semibold">
                              {new Date(subscription.expiresAt).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Billing History */}
                <Card className="glass">
                  <CardHeader>
                    <CardTitle>Billing History</CardTitle>
                    <CardDescription>Your subscription and credit transactions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingEvents ? (
                      <p className="text-sm text-muted-foreground">Loading transactions...</p>
                    ) : billingEvents.length > 0 ? (
                      <div className="space-y-2">
                        {billingEvents.map((event) => (
                          <div key={event.id} className="flex justify-between p-3 rounded-lg bg-muted/30">
                            <div>
                              <p className="font-medium capitalize">
                                {event.event_type.replace(/_/g, ' ')}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(event.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <p className="font-semibold">
                              {event.amount_cents > 0 
                                ? `$${(event.amount_cents / 100).toFixed(2)}`
                                : event.metadata?.credits 
                                ? `+${event.metadata.credits} credits` 
                                : '-'}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No billing history yet</p>
                    )}
                    <Button 
                      variant="outline" 
                      className="w-full mt-4"
                      onClick={() => navigate('/billing-history')}
                    >
                      View Full History
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="preferences" className="mt-6">
              <Card className="glass">
                <CardHeader>
                  <CardTitle>Preferences</CardTitle>
                  <CardDescription>Customize your platform experience</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                    <div className="space-y-0.5">
                      <Label>Dark Mode</Label>
                      <p className="text-sm text-muted-foreground">Toggle dark mode theme</p>
                    </div>
                    <Switch 
                      checked={theme === "dark"}
                      onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Default AI Model</Label>
                    <Input value="Lovable AI" disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Default Image Format</Label>
                    <Input value="PNG" disabled />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications" className="mt-6">
              <Card className="glass">
                <CardHeader>
                  <CardTitle>Notifications</CardTitle>
                  <CardDescription>Manage how you receive notifications</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                    <div className="space-y-0.5">
                      <Label>Credit Alerts</Label>
                      <p className="text-sm text-muted-foreground">Get notified when trial credits are running low</p>
                    </div>
                    <Switch 
                      checked={creditAlerts}
                      onCheckedChange={setCreditAlerts}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                    <div className="space-y-0.5">
                      <Label>New Features</Label>
                      <p className="text-sm text-muted-foreground">Updates about new platform features</p>
                    </div>
                    <Switch 
                      checked={newFeatures}
                      onCheckedChange={setNewFeatures}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                    <div className="space-y-0.5">
                      <Label>Gallery Updates</Label>
                      <p className="text-sm text-muted-foreground">Notifications about inspire gallery</p>
                    </div>
                    <Switch 
                      checked={galleryUpdates}
                      onCheckedChange={setGalleryUpdates}
                    />
                  </div>
                  <Button onClick={handleSaveNotifications} disabled={isLoading}>
                    {isLoading ? "Saving..." : "Save Preferences"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Settings;
