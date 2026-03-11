"use client";

import { LogOut, Receipt, Calendar, ClipboardList } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/use-session";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/billing", label: "Billing", icon: Receipt },
  { href: "/appointments", label: "Appointments", icon: Calendar },
  { href: "/orders", label: "Orders", icon: ClipboardList },
];

export function POSHeader() {
  const pathname = usePathname();
  const { data: session } = useSession();

  function handleLogout() {
    window.location.href = "/api/auth/logout";
  }

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-4">
      <h1 className="text-lg font-bold tracking-tight">CareVibes POS</h1>

      <nav className="flex items-center gap-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}>
            <Button
              variant={pathname.startsWith(href) ? "secondary" : "ghost"}
              size="sm"
              className={cn(
                "gap-1.5",
                pathname.startsWith(href) && "font-semibold"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Button>
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-3">
        {session && (
          <span className="text-sm text-muted-foreground">
            {session.full_name}
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          aria-label="Logout"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
