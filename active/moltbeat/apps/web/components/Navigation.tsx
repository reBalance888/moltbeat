'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, TrendingUp, Network } from 'lucide-react';

const NavLink = ({ href, label, icon: Icon }: { href: string; label: string; icon: any }) => {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + '/');

  return (
    <Link
      href={href}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
        isActive
          ? 'bg-blue-100 text-blue-700 font-medium'
          : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span>{label}</span>
    </Link>
  );
};

export function Navigation() {
  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <span className="text-2xl">📊</span>
            <span className="text-slate-900">MoltBeat</span>
          </Link>

          {/* Nav Links */}
          <div className="flex items-center gap-2">
            <NavLink href="/pulse" label="Pulse" icon={Activity} />
            <NavLink href="/graph" label="Graph" icon={Network} />
            <NavLink href="/trends" label="Trends" icon={TrendingUp} />
          </div>

          {/* Status Indicator */}
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-slate-600">Connected</span>
          </div>
        </div>
      </div>
    </nav>
  );
}
