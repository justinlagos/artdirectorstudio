import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { UserAnalytics } from "@/components/UserAnalytics";
import { Skeleton } from "@/components/ui/skeleton";

const Analytics = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth", { 
        state: { message: "Please sign in to view your analytics." }
      });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-start justify-center px-4 py-8">
          <div className="w-full max-w-5xl">
            <Skeleton className="h-96 w-full" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-5xl space-y-8 text-center">
          <div className="space-y-3">
            <h1 className="text-4xl font-bold">Analytics</h1>
            <p className="text-muted-foreground text-lg">
              Track your usage and activity insights
            </p>
          </div>
          <UserAnalytics />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Analytics;
