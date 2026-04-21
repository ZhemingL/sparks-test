import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { label: "首页", path: "/" },
  { label: "关于我们", path: "/about" },
  { label: "工作坊", path: "/workshops" },
  { label: "常见问题", path: "/faq" },
];

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <svg width="36" height="36" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M50 10C30 10 15 25 15 45C15 55 20 63 28 68L25 85C25 88 28 90 30 88L42 78C44 79 47 79 50 79C70 79 85 64 85 45C85 25 70 10 50 10Z" stroke="hsl(var(--primary))" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="35" cy="25" r="3" fill="hsl(var(--primary))"/>
              <circle cx="68" cy="20" r="2.5" fill="hsl(var(--primary))"/>
            </svg>
            <div className="flex flex-col leading-none">
              <span className="font-display text-lg font-bold text-foreground">SPARKS</span>
              <span className="text-xs text-muted-foreground">云拾心火</span>
            </div>
          </div>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary ${
                location.pathname === item.path
                  ? "text-primary"
                  : "text-foreground/70 hover:text-foreground"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <Link to="/register">
            <Button size="sm" className="ml-2 rounded-full">
              立即报名
            </Button>
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile nav */}
      {isOpen && (
        <div className="border-t bg-background p-4 md:hidden">
          <div className="flex flex-col gap-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={`rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                  location.pathname === item.path
                    ? "bg-primary/10 text-primary"
                    : "text-foreground/70 hover:bg-secondary"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <Link to="/register" onClick={() => setIsOpen(false)}>
              <Button className="mt-2 w-full rounded-full">立即报名</Button>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
