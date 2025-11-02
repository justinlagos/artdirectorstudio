import { useState, useEffect } from "react";
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
import { useCredits } from "@/hooks/useCredits";
import { CreditPurchaseDialog } from "@/components/CreditPurchaseDialog";
import { User, Shield, CreditCard, Settings2, Bell } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "next-themes";

const Settings = () => {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { balance, refetch } = useCredits();
  const [isLoading, setIsLoading] = useState(false);
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  
  // Profile state
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  
  // Security state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  
  // Notifications state
  const [creditAlerts, setCreditAlerts] = useState(true);
  const [newFeatures, setNewFeatures] = useState(true);
  const [galleryUpdates, setGalleryUpdates] = useState(false);
  
  // Transaction history
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  useEffect(() => {
    if (user) {
      loadProfile();
      loadNotificationPreferences();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username, bio')
        .eq('id', user?.id)
        .single();
      
      if (data) {
        setUsername(data.username || "");
        setBio(data.bio || "");
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

  const loadTransactions = async () => {
    if (!user) return;
    
    setLoadingTransactions(true);
    try {
      const { data, error } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error("Error loading transactions:", error);
      toast.error("Failed to load transaction history");
    } finally {
      setLoadingTransactions(false);
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
                <span className="hidden sm:inline">Billing</span>
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

            <TabsContent value="billing" className="mt-6" onFocus={loadTransactions}>
              <Card className="glass">
                <CardHeader>
                  <CardTitle>Credits & Billing</CardTitle>
                  <CardDescription>Manage your credits and payment information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-6 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                    <p className="text-sm text-muted-foreground mb-2">Current Balance</p>
                    <p className="text-4xl font-bold">{balance ?? 0} Credits</p>
                    <Button className="mt-4" onClick={() => setPurchaseDialogOpen(true)}>
                      Purchase Credits
                    </Button>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-4">Transaction History</h3>
                    {loadingTransactions ? (
                      <p className="text-sm text-muted-foreground">Loading transactions...</p>
                    ) : transactions.length > 0 ? (
                      <div className="space-y-2">
                        {transactions.map((tx) => (
                          <div key={tx.id} className="flex justify-between p-3 rounded-lg bg-muted/30">
                            <div>
                              <p className="font-medium capitalize">{tx.action || 'Transaction'}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(tx.timestamp).toLocaleDateString()} • {tx.provider}
                              </p>
                              {tx.notes && <p className="text-xs text-muted-foreground mt-1">{tx.notes}</p>}
                            </div>
                            <p className={`font-semibold ${tx.amount > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              {tx.amount > 0 ? '+' : ''}{tx.amount}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No transactions yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
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
                      <p className="text-sm text-muted-foreground">Get notified when credits are low</p>
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
      
      <CreditPurchaseDialog 
        open={purchaseDialogOpen} 
        onOpenChange={setPurchaseDialogOpen} 
      />
    </div>
  );
};

export default Settings;