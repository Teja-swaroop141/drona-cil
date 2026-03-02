import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Globe, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { toast } from "sonner";
import ntsCircularLogo from "@/assets/nts-circular-logo.jpeg";

const Header = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Error signing out");
    } else {
      toast.success("Signed out successfully");
      navigate("/");
    }
  };

  const navLinks = [
    { label: "For Individual", path: "/contact/individual" },
    { label: "For University", path: "/contact/university" },
    { label: "For Government", path: "/contact/government" },
  ];

  return (
    <header className="border-b bg-background sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6">
        {/* Main header row */}
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div
            className="flex items-center gap-2 cursor-pointer shrink-0"
            onClick={() => navigate("/")}
          >
            <img
              src={ntsCircularLogo}
              alt="NTS CCGS CIIL Logo"
              className="w-9 h-9 rounded-full object-cover"
            />
            <span className="font-semibold text-base sm:text-lg text-primary whitespace-nowrap">
              NTS-I CIIL Learning
            </span>
          </div>

          {/* Desktop nav links */}
          <nav className="hidden lg:flex items-center gap-6">
            {navLinks.map((link) => (
              <button
                key={link.path}
                type="button"
                className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors whitespace-nowrap"
                onClick={() => navigate(link.path)}
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Right section: translate + auth */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Translate button */}
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-primary hover:bg-muted/50 transition-colors"
              onClick={() => (window as any).toggleTranslateWidget?.()}
              title="Translate page"
            >
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Translate</span>
            </button>

            {/* Auth buttons */}
            {user ? (
              <Button
                variant="outline"
                size="sm"
                className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-1.5" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                  onClick={() => navigate("/auth")}
                >
                  Log In
                </Button>
                <Button
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={() => navigate("/auth")}
                >
                  Sign Up
                </Button>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button
              type="button"
              className="lg:hidden p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t py-3 space-y-1">
            {navLinks.map((link) => (
              <button
                key={link.path}
                type="button"
                className="block w-full text-left px-3 py-2 rounded-md text-sm font-medium text-foreground/80 hover:text-primary hover:bg-muted/50 transition-colors"
                onClick={() => {
                  navigate(link.path);
                  setMobileMenuOpen(false);
                }}
              >
                {link.label}
              </button>
            ))}
            {!user && (
              <div className="flex gap-2 px-3 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                  onClick={() => { navigate("/auth"); setMobileMenuOpen(false); }}
                >
                  Log In
                </Button>
                <Button
                  size="sm"
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={() => { navigate("/auth"); setMobileMenuOpen(false); }}
                >
                  Sign Up
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
