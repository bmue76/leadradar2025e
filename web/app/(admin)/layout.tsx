// app/(admin)/layout.tsx
import type { ReactNode } from "react";
import { LogoutButton } from "@/components/admin/LogoutButton";

type AdminLayoutProps = {
  children: ReactNode;
};

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="w-full border-b bg-white">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-800">
            LeadRadar Admin
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto max-w-6xl w-full px-4 py-6">{children}</main>
    </div>
  );
}
