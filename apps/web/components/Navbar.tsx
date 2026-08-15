'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { tournamentConfig } from '../config/tournament';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileOpen(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const navLinks = [
    { label: '🔴 Live Scores', href: '/#live-scores', id: 'nav-scores' },
    { label: 'Overview', href: '/', id: 'nav-overview' },
    { label: 'Tournament Info', href: '/#details', id: 'nav-details' },
    { label: 'Register Squad', href: '/register', id: 'nav-register' },
  ];

  return (
    <header
      className="md:hidden md-hide"
      style={{
        position: 'fixed',
        top: '12px',
        left: 0,
        right: 0,
        zIndex: 100,
        display: 'flex',
        justifyContent: 'center',
        padding: '0 12px',
        pointerEvents: 'none',
      }}
    >
      {/* Mobile Floating Pill Container */}
      <div
        style={{
          pointerEvents: 'auto',
          width: '100%',
          maxWidth: '480px',
          height: '48px',
          borderRadius: '9999px',
          background: scrolled ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15, 12, 12, 0.90)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: scrolled
            ? '1.5px solid var(--color-border)'
            : '1.5px solid rgba(255, 255, 255, 0.15)',
          boxShadow: scrolled
            ? '0 8px 24px rgba(0, 0, 0, 0.08)'
            : '0 10px 30px rgba(0, 0, 0, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px 0 16px',
          transition: 'all var(--dur-base) var(--ease-out)',
        }}
      >
        {/* Brand Logo & Tag */}
        <Link
          href="/"
          id="nav-brand"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            textDecoration: 'none',
          }}
        >
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'var(--color-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-accent-ink)',
              fontWeight: 900,
              fontSize: '0.75rem',
              fontFamily: 'var(--font-display)',
            }}
          >
            🏏
          </div>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 900,
              fontSize: '1.3rem',
              letterSpacing: '0.04em',
              color: scrolled ? 'var(--color-ink)' : 'var(--color-paper)',
              whiteSpace: 'nowrap',
              textTransform: 'uppercase',
            }}
          >
            {tournamentConfig.shortName || 'CPL'}
          </span>
        </Link>

        {/* Action Button & Menu Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link
            href="/register"
            className="btn-hallmark-primary"
            style={{
              height: '32px',
              padding: '0 12px',
              fontSize: '0.8rem',
              borderRadius: '9999px',
            }}
          >
            Register
          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Close Menu' : 'Open Menu'}
            style={{
              background: mobileOpen ? 'rgba(192, 39, 45, 0.15)' : 'transparent',
              border: mobileOpen ? '1px solid var(--color-accent)' : 'none',
              borderRadius: '8px',
              color: scrolled ? 'var(--color-ink)' : 'var(--color-paper)',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              {mobileOpen ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Sheet */}
      {mobileOpen && (
        <div
          style={{
            position: 'absolute',
            top: '66px',
            left: '12px',
            right: '12px',
            maxWidth: '480px',
            margin: '0 auto',
            pointerEvents: 'auto',
            background: 'var(--color-paper-dark)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1.5px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 'var(--radius-lg)',
            padding: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.75)',
            zIndex: 101,
          }}
        >
          {navLinks.map((link) => (
            <Link
              key={`mobile-${link.id}`}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              style={{
                height: '42px',
                display: 'flex',
                alignItems: 'center',
                padding: '0 16px',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-paper)',
                fontFamily: 'var(--font-display)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                fontWeight: 800,
                fontSize: '1rem',
                textDecoration: 'none',
                background: link.id === 'nav-scores' ? 'rgba(192, 39, 45, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                border: link.id === 'nav-scores' ? '1px solid var(--color-accent)' : '1px solid rgba(255, 255, 255, 0.06)',
                transition: 'all var(--dur-fast)',
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
