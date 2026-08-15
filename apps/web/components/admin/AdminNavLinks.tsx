'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface AdminNavLinksProps {
  entryPath: string;
}

export default function AdminNavLinks({ entryPath }: AdminNavLinksProps) {
  const pathname = usePathname();

  const links = [
    {
      href: `/${entryPath}/dashboard`,
      label: 'Dashboard',
      icon: '📊',
      badge: null,
    },
    {
      href: `/${entryPath}/registrations`,
      label: 'Registrations',
      icon: '📋',
      badge: null,
    },
    {
      href: `/${entryPath}/teams`,
      label: 'Official Teams',
      icon: '🛡️',
      badge: null,
    },
    {
      href: `/${entryPath}/players`,
      label: 'Official Players',
      icon: '🏏',
      badge: null,
    },
    {
      href: `/${entryPath}/tournaments`,
      label: 'Tournaments',
      icon: '🏆',
      badge: null,
    },
    {
      href: `/${entryPath}/matches`,
      label: 'Live Matches & Scoring',
      icon: '🔴',
      badge: 'LIVE',
    },
    {
      href: `/${entryPath}/registration-exceptions`,
      label: 'Eligibility Exceptions',
      icon: '⚙️',
      badge: null,
    },
  ];

  return (
    <nav className="flex flex-col gap-1.5">
      {links.map((item) => {
        const isActive = pathname === item.href || (item.href !== `/${entryPath}` && pathname.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={true}
            className={`group relative flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
              isActive
                ? 'bg-gradient-to-r from-[#C0272D]/25 to-[#C0272D]/10 text-white font-semibold border border-[#C0272D]/35 shadow-lg shadow-[#C0272D]/10'
                : 'text-white/70 hover:text-white hover:bg-white/[0.04] border border-transparent'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-base group-hover:scale-110 transition-transform duration-200">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </div>

            {item.badge && (
              <span className="px-1.5 py-0.5 text-[10px] font-extrabold tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-md font-mono animate-pulse">
                {item.badge}
              </span>
            )}

            {isActive && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-[#C0272D] shadow-md shadow-[#C0272D]" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
