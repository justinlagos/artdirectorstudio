import { UserMenu } from "./UserMenu";
import { CreditBalance } from "./CreditBalance";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";

export const Header = () => {
  const { user } = useAuth();
  
  return (
    <header className="border-b border-border py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            <ThemeToggle />
            {user && <CreditBalance />}
            <UserMenu />
          </div>
        </div>
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-semibold mb-3">
            ArtDirector Studio
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Reconstruct. Refine. Reimagine.
          </p>
        </div>
      </div>
    </header>
  );
};
