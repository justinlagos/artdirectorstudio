import { useAuth } from "@/contexts/AuthContext";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, User, History, Shield, Settings, BarChart3, Crown } from "lucide-react";

export const UserMenu = () => {
  const { user, signOut } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const navigate = useNavigate();

  if (!user) return null;

  const userInitials = user.email
    ?.split("@")[0]
    .substring(0, 2)
    .toUpperCase() || "U";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary text-primary-foreground">
              {userInitials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">My Account</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/settings")} className="cursor-pointer">
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/history")} className="cursor-pointer">
          <History className="mr-2 h-4 w-4" />
          <span>My Projects</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/insights")} className="cursor-pointer">
          <BarChart3 className="mr-2 h-4 w-4" />
          <span>Insights</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/plans")} className="cursor-pointer">
          <Crown className="mr-2 h-4 w-4" />
          <span>Plans</span>
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem onClick={() => navigate("/admin")} className="cursor-pointer">
            <Shield className="mr-2 h-4 w-4" />
            <span>Admin Dashboard</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut} className="text-destructive cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
