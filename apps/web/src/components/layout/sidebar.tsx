'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ActiveBatchesBadge } from './active-batches-badge';
import { SidebarNav } from './sidebar-nav';
import { NAV, filterNavForRole } from './nav-config';
import type { UserRole } from '@qualiof/db';

const STORAGE_KEY = 'qualiof-sidebar-collapsed';

interface SidebarProps {
  /**
   * Rôle de l'utilisateur — la sidebar filtre NAV elle-même côté client.
   * On ne peut PAS passer un tableau d'items contenant des `icon` (React
   * components Lucide) à travers la frontière Server→Client : les fonctions
   * ne sont pas sérialisables. Donc on passe juste le rôle (string).
   */
  role: UserRole;
}

/**
 * Sidebar desktop (hidden < md, visible >= md). Pour mobile, voir <MobileNavDrawer>
 * activé par <MobileMenuButton> dans la TopBar.
 *
 * État `collapsed` (largeur 256/64 px) persiste dans localStorage.
 * Le rendu de la nav est délégué à <SidebarNav> qui consomme la prop `nav`.
 */
export function Sidebar({ role }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const nav = filterNavForRole(NAV, role);

  // Hydrate l'état depuis localStorage côté client (SSR ne le voit pas)
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === '1');
    } catch {
      // ignore
    }
  }, []);

  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      } catch {
        // ignore
      }
      return next;
    });
  };

  return (
    <aside
      className={cn(
        'hidden md:flex shrink-0 fixed top-4 left-4 bottom-4 z-30 flex-col transition-[width] duration-300 ease-out',
        'glass-panel-strong overflow-hidden',
        collapsed ? 'w-[68px]' : 'w-64',
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-16 h-64 w-64 rounded-full bg-primary/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -right-16 h-64 w-64 rounded-full bg-halloween-glow/15 blur-3xl"
      />

      <div
        className={cn(
          'relative flex items-center',
          collapsed ? 'px-3 py-5 justify-center' : 'px-5 py-5',
        )}
      >
        <Link href="/app" className="flex items-center gap-3 group">
          <div className="relative h-10 w-10 rounded-xl bg-mystic-gradient text-white font-bold inline-flex items-center justify-center shrink-0 ring-1 ring-white/20 shadow-mystic transition-all duration-300 group-hover:scale-105 group-hover:shadow-ember">
            <span className="relative z-10">Q</span>
            <div className="absolute inset-0 rounded-xl bg-ember-gradient opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <span className="relative z-10 group-hover:hidden">Q</span>
            <span className="absolute z-10 hidden group-hover:inline">🎃</span>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="font-semibold text-sm leading-tight text-zinc-100">QualiOF</div>
              <div className="text-[11px] text-zinc-400">Start Academy</div>
            </div>
          )}
        </Link>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <SidebarNav nav={nav} collapsed={collapsed} />
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-black/60 to-transparent" />
      </div>

      <ActiveBatchesBadge collapsed={collapsed} />

      <div
        className={cn(
          'relative flex items-center',
          collapsed ? 'p-2 justify-center' : 'px-5 py-3 justify-between',
        )}
      >
        {!collapsed && (
          <span className="text-[10px] uppercase tracking-wider font-medium text-zinc-500">v0.1.0</span>
        )}
        <button
          type="button"
          onClick={toggle}
          title={collapsed ? 'Déplier la sidebar' : 'Replier la sidebar'}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-halloween-glow hover:bg-white/5 hover:ring-1 hover:ring-halloween-glow/30 transition-all duration-300"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  );
}
