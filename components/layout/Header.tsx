'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const Header = () => {
    const pathname = usePathname();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [hash, setHash] = useState('');

    // Track hash changes for anchor-based navigation (e.g. Gallery)
    useEffect(() => {
        setHash(window.location.hash);
        const onHashChange = () => setHash(window.location.hash);
        window.addEventListener('hashchange', onHashChange);
        return () => window.removeEventListener('hashchange', onHashChange);
    }, []);

    // Reset hash tracking on route change & close mobile menu
    useEffect(() => {
        setMobileMenuOpen(false);
        setHash(window.location.hash);
    }, [pathname]);

    // Prevent body scroll when mobile menu is open
    useEffect(() => {
        if (mobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [mobileMenuOpen]);

    const navItems = [
        { name: 'Home', path: '/' },
        { name: 'Submit Photo', path: '/submit' },
        { name: 'Manager', path: '/organize' },
    ];

    const getIsActive = (itemPath: string) => {
        // Home: active only when on "/" with no hash
        if (itemPath === '/') return pathname === '/';

        // Hash-based links (if any)
        if (itemPath.includes('#')) {
            const [basePath, fragment] = itemPath.split('#');
            return pathname === (basePath || '/') && hash === `#${fragment}`;
        }

        // Manager: also active on /editor sub-routes
        if (itemPath === '/organize') return pathname === '/organize' || (pathname?.startsWith('/editor') ?? false);

        // Gallery or others: exact matching or startsWith handling
        if (itemPath === '/gallery') return pathname?.startsWith('/gallery') ?? false;

        // Default exact match
        return pathname === itemPath;
    };

    return (
        <header className="fixed top-0 z-50 w-full border-b border-[var(--color-border)] bg-[var(--color-background)]">
            <div className="flex h-[72px] items-center justify-between px-4 md:px-8">
                {/* Logo Area */}
                <Link href="/" className="flex items-center gap-3 group">
                    <div className="relative flex items-center justify-center h-8 w-8 shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="/logo.png"
                            alt="Luminar Logo"
                            className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-110"
                        />
                    </div>
                    <span className="font-display text-[1.125rem] font-bold tracking-[0.15em] text-[var(--color-foreground)] uppercase mt-0.5">LUMINAR <span className="text-[10px] tracking-normal text-neutral-500">DEMO</span></span>
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden sm:flex items-center gap-2">
                    {navItems.map((item) => {
                        const isActive = getIsActive(item.path);
                        return (
                            <Link
                                key={item.name}
                                href={item.path}
                                onClick={() => {
                                    const newHash = item.path.includes('#') ? `#${item.path.split('#')[1]}` : '';
                                    setHash(newHash);
                                }}
                                className={`px-5 py-1.5 text-sm font-medium rounded-[12px] transition-colors ${isActive
                                    ? 'bg-[var(--color-foreground)] text-[var(--color-background)]'
                                    : 'text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-foreground)]'
                                    }`}
                            >
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                {/* Mobile Hamburger Button */}
                <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="sm:hidden flex flex-col items-center justify-center w-10 h-10 rounded-lg hover:bg-[var(--color-surface)] transition-colors"
                    aria-label="Toggle menu"
                >
                    <span className={`block w-5 h-[2px] bg-[var(--color-foreground)] transition-all duration-300 ${mobileMenuOpen ? 'rotate-45 translate-y-[8px]' : ''}`} />
                    <span className={`block w-5 h-[2px] bg-[var(--color-foreground)] transition-all duration-300 mt-[6px] ${mobileMenuOpen ? 'opacity-0' : ''}`} />
                    <span className={`block w-5 h-[2px] bg-[var(--color-foreground)] transition-all duration-300 mt-[6px] ${mobileMenuOpen ? '-rotate-45 -translate-y-[8px]' : ''}`} />
                </button>
            </div>

            {/* Mobile Menu Dropdown */}
            {mobileMenuOpen && (
                <div className="sm:hidden absolute top-[72px] left-0 right-0 bg-[var(--color-background)]/95 backdrop-blur-xl border-b border-[var(--color-border)] shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
                    <nav className="flex flex-col p-4 gap-1">
                        {navItems.map((item) => {
                            const isActive = getIsActive(item.path);
                            return (
                                <Link
                                    key={item.name}
                                    href={item.path}
                                    onClick={() => {
                                        setMobileMenuOpen(false);
                                        const newHash = item.path.includes('#') ? `#${item.path.split('#')[1]}` : '';
                                        setHash(newHash);
                                    }}
                                    className={`px-5 py-3 text-sm font-medium rounded-[12px] transition-colors ${isActive
                                        ? 'bg-[var(--color-foreground)] text-[var(--color-background)]'
                                        : 'text-[var(--color-foreground)] hover:bg-[var(--color-surface)]'
                                        }`}
                                >
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>
                </div>
            )}
        </header>
    );
};
