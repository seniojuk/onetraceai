import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowUpRight, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme/ThemeProvider";

export function PublicNav() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const linkClass = (active: boolean) =>
    `text-[13px] transition-colors ${
      active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-accent font-mono text-[11px] font-medium text-accent-foreground">
            OT
          </span>
          <span className="font-geist text-[15px] font-medium tracking-[-0.01em] text-foreground">
            OneTrace <span className="text-muted-foreground">AI</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          <Link to="/#problem" className={linkClass(false)}>Problem</Link>
          <Link to="/#solution" className={linkClass(false)}>Solution</Link>
          <Link to="/#how" className={linkClass(false)}>How it works</Link>
          <Link to="/pricing" className={linkClass(pathname === "/pricing")}>Pricing</Link>
          <Link to="/contact" className={linkClass(pathname === "/contact")}>Contact</Link>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            to="/auth?mode=login"
            className="hidden text-[13px] text-muted-foreground hover:text-foreground sm:inline"
          >
            Sign in
          </Link>
          <Link
            to="/auth?mode=signup"
            className="btn-3d btn-3d-primary inline-flex h-8 items-center gap-1 px-3 text-[12.5px] font-medium"
          >
            Start free <ArrowUpRight className="h-3 w-3" />
          </Link>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button className="md:hidden" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent>
              <div className="mt-8 flex flex-col gap-4">
                <Link to="/#problem" onClick={() => setOpen(false)}>Problem</Link>
                <Link to="/#solution" onClick={() => setOpen(false)}>Solution</Link>
                <Link to="/#how" onClick={() => setOpen(false)}>How it works</Link>
                <Link to="/pricing" onClick={() => setOpen(false)}>Pricing</Link>
                <Link to="/contact" onClick={() => setOpen(false)}>Contact</Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
