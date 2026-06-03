import { ReactNode, useEffect, createContext, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface AuthGuardProps {
  children: ReactNode;
}

// Marks that an AuthGuard is already active higher in the tree.
// Nested AuthGuards become pass-through so per-page wrappers
// don't tear down and rebuild on every navigation.
const AuthGuardActiveContext = createContext(false);

export function AuthGuard({ children }: AuthGuardProps) {
  const alreadyGuarded = useContext(AuthGuardActiveContext);

  if (alreadyGuarded) {
    return <>{children}</>;
  }

  return <AuthGuardImpl>{children}</AuthGuardImpl>;
}

function AuthGuardImpl({ children }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth", { state: { from: location.pathname } });
    }
  }, [user, loading, navigate, location]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <AuthGuardActiveContext.Provider value={true}>
      {children}
    </AuthGuardActiveContext.Provider>
  );
}
