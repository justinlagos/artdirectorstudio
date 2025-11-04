import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { LoadingState } from "@/components/LoadingState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminAnalytics } from "@/components/admin/AdminAnalytics";
import { PricingManagement } from "@/components/admin/PricingManagement";
import { AdminUserManagement } from "@/components/admin/AdminUserManagement";
import { SystemHealth } from "@/components/admin/SystemHealth";
import { AdminBetaManagement } from "@/components/admin/AdminBetaManagement";
import { AdminTestimonials } from "@/components/admin/AdminTestimonials";
import { AdminRevenue } from "@/components/admin/AdminRevenue";
import { AdminUsagePatterns } from "@/components/admin/AdminUsagePatterns";
import { AdminActiveUsers } from "@/components/admin/AdminActiveUsers";
import { EnhancedPricingManagement } from "@/components/admin/EnhancedPricingManagement";
import { Shield } from "lucide-react";

const Admin = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    } else if (!adminLoading && !isAdmin) {
      navigate("/");
    }
  }, [user, authLoading, isAdmin, adminLoading, navigate]);

  if (authLoading || adminLoading) {
    return <LoadingState />;
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-12 max-w-7xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8" />
            <h1 className="text-3xl font-semibold">Admin Dashboard</h1>
          </div>
          <p className="text-muted-foreground">
            Comprehensive platform management, analytics, and control center
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="usage">Usage</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
            <TabsTrigger value="testimonials">Content</TabsTrigger>
            <TabsTrigger value="beta">Beta</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <AdminAnalytics />
            <SystemHealth />
          </TabsContent>

          <TabsContent value="revenue" className="space-y-6">
            <AdminRevenue />
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <AdminUserManagement />
          </TabsContent>

          <TabsContent value="active" className="space-y-6">
            <AdminActiveUsers />
          </TabsContent>

          <TabsContent value="usage" className="space-y-6">
            <AdminUsagePatterns />
          </TabsContent>

          <TabsContent value="pricing" className="space-y-6">
            <EnhancedPricingManagement />
          </TabsContent>

          <TabsContent value="testimonials" className="space-y-6">
            <AdminTestimonials />
          </TabsContent>

          <TabsContent value="beta" className="space-y-6">
            <AdminBetaManagement />
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
};

export default Admin;
