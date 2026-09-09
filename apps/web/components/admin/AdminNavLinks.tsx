'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface AdminNavLinksProps {
  entryPath: string;
}

export default function AdminNavLinks({ entryPath }: AdminNavLinksProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
      href: `/${entryPath}/tournament-bracket`,
      label: 'CPL Bracket & Groups',
      icon: '🌿',
      badge: '8-TEAM',
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
    <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {links.map((item) => {
        const isActive =
          mounted &&
          (pathname === item.href ||
            (item.href !== `/${entryPath}` && pathname.startsWith(item.href)));

        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={true}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: isActive ? 700 : 500,
              backgroundColor: isActive ? '#C0272D' : 'transparent',
              color: isActive ? '#FFFFFF' : '#94A3B8',
              border: isActive ? '1px solid #D32F35' : '1px solid transparent',
              boxShadow: isActive ? '0 2px 8px rgba(192, 39, 45, 0.25)' : 'none',
              transition: 'all 0.15s ease',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              <span style={{ fontSize: '15px', flexShrink: 0 }}>{item.icon}</span>
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {item.label}
              </span>
            </div>

            {item.badge && (
              <span
                style={{
                  padding: '2px 6px',
                  fontSize: '9px',
                  fontWeight: 800,
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                  letterSpacing: '0.05em',
                  backgroundColor: isActive ? 'rgba(0, 0, 0, 0.4)' : 'rgba(239, 68, 68, 0.2)',
                  color: isActive ? '#FEF08A' : '#F87171',
                  border: isActive ? 'none' : '1px solid rgba(239, 68, 68, 0.3)',
                  flexShrink: 0,
                }}
              >
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
