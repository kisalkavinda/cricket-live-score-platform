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
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: '🔴 Live Scores', href: '/#live-scores', id: 'nav-scores' },
    { label: 'Overview', href: '/', id: 'nav-overview' },
    { label: 'Tournament Info', href: '/#details', id: 'nav-details' },
    { label: 'Register Squad', href: '/register', id: 'nav-register' },
  ];

  return (
    <header
      style={{
        position: 'fixed',
        top: '16px',
        left: 0,
        right: 0,
        zIndex: 100,
        display: 'flex',
        justifyContent: 'center',
        padding: '0 16px',
        pointerEvents: 'none',
      }}
    >
      {/* Floating Pill Container (N5 Floating Pill Nav Archetype) */}
      <div
        style={{
          pointerEvents: 'auto',
          width: '100%',
          maxWidth: '960px',
          height: '54px',
          borderRadius: '9999px',
          background: scrolled ? 'rgba(255, 255, 255, 0.94)' : 'rgba(15, 12, 12, 0.88)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: scrolled
            ? '1.5px solid var(--color-border)'
            : '1.5px solid rgba(255, 255, 255, 0.15)',
          boxShadow: scrolled
            ? '0 8px 30px rgba(0, 0, 0, 0.08)'
            : '0 12px 40px rgba(0, 0, 0, 0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
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
            gap: '10px',
            textDecoration: 'none',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'var(--color-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-accent-ink)',
              fontWeight: 900,
              fontSize: '0.85rem',
              fontFamily: 'var(--font-display)',
            }}
          >
            🏏
          </div>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 900,
              fontSize: '1.45rem',
              letterSpacing: '0.04em',
              color: scrolled ? 'var(--color-ink)' : 'var(--color-paper)',
              whiteSpace: 'nowrap',
            }}
          >
            {tournamentConfig.shortName || 'CPL'}
          </span>
        </Link>

        {/* Desktop Nav Links */}
        <nav
          style={{
            alignItems: 'center',
            gap: '6px',
          }}
          aria-label="Main Navigation"
          className="hidden md:flex"
        >
          {navLinks.map((link) => (
            <Link
              key={link.id}
              id={link.id}
              href={link.href}
              style={{
                padding: '6px 14px',
                borderRadius: '9999px',
                fontFamily: 'var(--font-body)',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: scrolled ? 'var(--color-ink)' : 'rgba(255, 255, 255, 0.85)',
                textDecoration: 'none',
                whiteSpace: 'nowrap', // Gate 49
                transition: 'background var(--dur-fast), color var(--dur-fast)',
              }}
              onMouseEnter={(e) => {
                const target = e.currentTarget;
                target.style.background = scrolled
                  ? 'var(--color-paper-alt)'
                  : 'rgba(255, 255, 255, 0.12)';
              }}
              onMouseLeave={(e) => {
                const target = e.currentTarget;
                target.style.background = 'transparent';
              }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Action Button & Mobile Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link
            href="/register"
            className="btn-hallmark-primary"
            style={{
              height: '36px',
              padding: '0 16px',
              fontSize: '0.85rem',
              borderRadius: '9999px',
            }}
          >
            Register
          </Link>

          {/* Mobile Menu Button */}
          <button
            type="button"
            className="md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Close Menu' : 'Open Menu'}
            style={{
              background: 'transparent',
              border: 'none',
              color: scrolled ? 'var(--color-ink)' : 'var(--color-paper)',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg
              width="22"
              height="22"
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
            top: '64px',
            left: '16px',
            right: '16px',
            pointerEvents: 'auto',
            background: 'rgba(15, 12, 12, 0.98)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid var(--color-border-dark)',
            borderRadius: '20px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
          }}
        >
          {navLinks.map((link) => (
            <Link
              key={`mobile-${link.id}`}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              style={{
                minHeight: '48px',
                display: 'flex',
                alignItems: 'center',
                padding: '0 18px',
                borderRadius: '12px',
                color: link.id === 'nav-scores' ? 'var(--color-accent-bright)' : 'var(--color-paper)',
                fontFamily: 'var(--font-body)',
                fontWeight: 700,
                fontSize: '0.95rem',
                textDecoration: 'none',
                background: link.id === 'nav-scores' ? 'rgba(192, 39, 45, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                border: link.id === 'nav-scores' ? '1px solid var(--color-accent)' : '1px solid transparent',
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
