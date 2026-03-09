"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/use-session";
import { PatientSearch } from "./patient-search";
import { DoctorSelector } from "./doctor-selector";

export function POSHeader() {
  const router = useRouter();
  const { data: session } = useSession();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-4">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-bold tracking-tight">CareVibes POS</h1>
        <PatientSearch />
        <DoctorSelector />
      </div>

      <div className="flex items-center gap-3">
        {session && (
          <span className="text-sm text-muted-foreground">
            {session.full_name}
          </span>
        )}
        <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Logout">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
