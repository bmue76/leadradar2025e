import Link from 'next/link';
import type { ReactNode } from 'react';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex">
      <aside className="w-64 border-r border-gray-200 p-6 space-y-4">
        <h2 className="text-xl font-bold mb-4">LeadRadar Admin</h2>
        <nav className="space-y-2 text-sm">
          <div>
            <div className="font-semibold text-gray-700 mb-1">Allgemein</div>
            <ul className="space-y-1">
              <li>
                <Link href="/admin" className="hover:underline">
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <div className="font-semibold text-gray-700 mb-1">Später</div>
            <ul className="space-y-1">
              <li className="text-gray-400">Messen / Events</li>
              <li className="text-gray-400">Formulare</li>
              <li className="text-gray-400">Leads</li>
              <li className="text-gray-400">Lizenzen / Benutzer</li>
            </ul>
          </div>
        </nav>
      </aside>

      <main className="flex-1 p-8 bg-gray-50">
        {children}
      </main>
    </div>
  );
}
