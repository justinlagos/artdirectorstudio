import { useNavigate } from "react-router-dom";
import { LogOut, Sparkles, GraduationCap, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const SignedOut = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/30">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <LogOut className="w-8 h-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">You've been signed out</CardTitle>
          <CardDescription>
            Thanks for using ArtDirector Studio
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button 
            onClick={() => navigate("/inspire")} 
            className="w-full gap-2"
            size="lg"
            variant="outline"
          >
            <Sparkles className="w-4 h-4" />
            Browse Inspire Gallery
          </Button>
          <Button 
            onClick={() => navigate("/help")} 
            className="w-full gap-2"
            size="lg"
            variant="outline"
          >
            <GraduationCap className="w-4 h-4" />
            Learn More
          </Button>
          <Button 
            onClick={() => navigate("/auth")} 
            className="w-full gap-2"
            size="lg"
          >
            <LogIn className="w-4 h-4" />
            Sign In Again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignedOut;
