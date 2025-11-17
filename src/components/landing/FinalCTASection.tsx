import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export const FinalCTASection = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  if (user) return null;

  return (
    <section 
      className="py-20 md:py-28 px-6 lg:px-8 bg-surface-1"
      aria-label="Final call to action"
    >
      <div className="max-w-4xl mx-auto text-center space-y-8 md:space-y-10">
        <h2 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold tracking-tight text-foreground leading-tight">
          Your ideas deserve better tools.
        </h2>
        
        <p className="text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Bring your concepts to life with clarity and speed.
        </p>

        <div className="pt-4">
          <Button 
            size="lg" 
            className="text-base md:text-lg px-8 md:px-10 py-6 md:py-7 h-auto font-medium rounded-lg shadow-subtle hover:shadow-medium transition-all duration-300 hover:scale-[1.02]"
            onClick={() => navigate("/auth")}
          >
            Start your free trial
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    </section>
  );
};

