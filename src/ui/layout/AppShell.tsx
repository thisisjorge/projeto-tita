import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { applyTheme, readTheme } from '../theme.js';
import { serviceWorkerManager, type PwaState } from '../../services/service-worker-manager.js';
import { StatusBanner } from '../components/StatusBanner.js';
import { getAppDatabase } from '../../services/db-provider.js';
import { IdbActiveWorkoutRepository } from '../../repositories/indexeddb/idb-workout-repository.js';
import { prefetchRouteChunks } from '../../services/route-prefetcher.js';
import {
  DumbbellIcon,
  ClipboardIcon,
  BookIcon,
  CalendarIcon,
  ChartIcon,
  SettingsIcon,
  BoltIcon,
  SunIcon,
  MoonIcon,
  ArrowLeftIcon,
  TitaBrandMonogram,
  type IconProps,
} from '../components/icons.js';

interface NavItem {
  readonly path: string;
  readonly label: string;
  readonly icon: React.FC<IconProps>;
  readonly section?: 'SESSION' | 'PERFORMANCE' | 'SYSTEM';
}

const NAV_ITEMS: readonly NavItem[] = [
  { path: '/', label: 'Treino', icon: DumbbellIcon, section: 'SESSION' },
  { path: '/routines', label: 'Rotinas', icon: ClipboardIcon, section: 'SESSION' },
  { path: '/library', label: 'Exercícios', icon: BookIcon, section: 'SESSION' },
  { path: '/history', label: 'Histórico', icon: CalendarIcon, section: 'PERFORMANCE' },
  { path: '/progress', label: 'Progresso', icon: ChartIcon, section: 'PERFORMANCE' },
  { path: '/settings', label: 'Ajustes', icon: SettingsIcon, section: 'SYSTEM' },
];

export const AppShell: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(readTheme);
  const [pwaState, setPwaState] = useState<PwaState>(serviceWorkerManager.getState());
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );

  useEffect(() => {
    // Non-blocking prefetch of secondary route chunks for offline PWA readiness
    prefetchRouteChunks();

    // Configure active workout checker for update deferral
    serviceWorkerManager.setActiveWorkoutChecker(async () => {
      try {
        const db = getAppDatabase();
        const repo = new IdbActiveWorkoutRepository(db);
        const active = await repo.getActive();
        return active !== null && (active.status === 'IN_PROGRESS' || active.status === 'PAUSED');
      } catch {
        return false;
      }
    });

    const unsubscribe = serviceWorkerManager.subscribe((state) => {
      setPwaState(state);
      setIsOnline(state.isOnline);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Apply theme
    applyTheme(theme);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const currentPath = location.pathname;

  const renderNavButton = (item: NavItem) => {
    const isActive = currentPath === item.path;
    const Icon = item.icon;
    return (
      <button
        key={item.path}
        onClick={() => navigate(item.path)}
        aria-current={isActive ? 'page' : undefined}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--tita-space-3)',
          padding: 'var(--tita-space-2) var(--tita-space-3)',
          borderRadius: 'var(--tita-radius-sm)',
          backgroundColor: isActive ? 'var(--tita-surface-2)' : 'transparent',
          color: isActive ? 'var(--tita-primary)' : 'var(--tita-text-muted)',
          border: 'none',
          borderLeft: isActive ? '3px solid var(--tita-primary)' : '3px solid transparent',
          cursor: 'pointer',
          fontSize: 'var(--tita-text-sm)',
          fontWeight: isActive ? 'var(--tita-weight-bold)' : 'var(--tita-weight-medium)',
          textAlign: 'left',
          minHeight: 'var(--tita-touch-min)',
          transition: 'all var(--tita-transition-fast)',
        }}
      >
        <Icon size={20} color={isActive ? 'var(--tita-primary)' : 'var(--tita-text-muted)'} />
        <span className="nav-label">{item.label}</span>
      </button>
    );
  };

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: 'var(--tita-bg)',
        color: 'var(--tita-text)',
      }}
    >
      {/* Skip to Main Content Link for Keyboard / Assistive Tech Navigation */}
      <a href="#main-content" className="tita-skip-link">
        Pular para o conteúdo principal
      </a>

      {/* Desktop Persistent Sidebar (≥ 1025px) & Tablet Rail (769px-1024px) */}
      <aside
        className="tita-sidebar"
        style={{
          display: 'none',
          flexDirection: 'column',
          justifyContent: 'space-between',
          borderRight: '1px solid var(--tita-border)',
          backgroundColor: 'var(--tita-surface)',
          padding: 'var(--tita-space-4)',
          zIndex: 20,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--tita-space-6)' }}>
          {/* Logo & Brand Lockup */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--tita-space-3)' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--tita-radius-md)',
                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.22)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 0 16px rgba(16, 185, 129, 0.12)',
              }}
            >
              {/* Branding provisório — refinável antes do lançamento público */}
              <TitaBrandMonogram size={28} />
            </div>
            <div className="brand-text">
              <h1
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 'var(--tita-weight-extrabold)',
                  letterSpacing: '0.08em',
                  fontFamily: 'var(--tita-font-display)',
                  textTransform: 'uppercase',
                  lineHeight: 1.05,
                  margin: 0,
                  color: 'var(--tita-text)',
                }}
              >
                PROJETO TITÃ
              </h1>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 'var(--tita-weight-semibold)',
                  color: 'var(--tita-text-muted)',
                  letterSpacing: '0.04em',
                  display: 'block',
                  marginTop: '2px',
                }}
              >
                Treino &amp; Força
              </span>
            </div>
          </div>

          {/* Categorized Navigation Links */}
          <nav
            aria-label="Navegação Principal"
            style={{ display: 'flex', flexDirection: 'column', gap: 'var(--tita-space-1)' }}
          >
            <div
              className="brand-text"
              style={{
                fontSize: '10px',
                fontWeight: 'var(--tita-weight-bold)',
                letterSpacing: '0.06em',
                color: 'var(--tita-text-subtle)',
                textTransform: 'uppercase',
                padding: 'var(--tita-space-1) var(--tita-space-3) 2px',
              }}
            >
              Treino
            </div>
            {renderNavButton(NAV_ITEMS[0])}
            {renderNavButton(NAV_ITEMS[1])}
            {renderNavButton(NAV_ITEMS[2])}

            <div
              className="brand-text"
              style={{
                fontSize: '10px',
                fontWeight: 'var(--tita-weight-bold)',
                letterSpacing: '0.06em',
                color: 'var(--tita-text-subtle)',
                textTransform: 'uppercase',
                padding: 'var(--tita-space-3) var(--tita-space-3) 2px',
                marginTop: 'var(--tita-space-2)',
                borderTop: '1px solid var(--tita-border)',
              }}
            >
              Análise
            </div>
            {renderNavButton(NAV_ITEMS[3])}
            {renderNavButton(NAV_ITEMS[4])}

            <div
              className="brand-text"
              style={{
                fontSize: '10px',
                fontWeight: 'var(--tita-weight-bold)',
                letterSpacing: '0.06em',
                color: 'var(--tita-text-subtle)',
                textTransform: 'uppercase',
                padding: 'var(--tita-space-3) var(--tita-space-3) 2px',
                marginTop: 'var(--tita-space-2)',
                borderTop: '1px solid var(--tita-border)',
              }}
            >
              Sistema
            </div>
            {renderNavButton(NAV_ITEMS[5])}
          </nav>
        </div>

        {/* Sidebar Footer Controls */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--tita-space-2)',
            paddingTop: 'var(--tita-space-4)',
            borderTop: '1px solid var(--tita-border)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 'var(--tita-text-xs)',
              color: 'var(--tita-text-muted)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: isOnline ? 'var(--tita-accent)' : 'var(--tita-warning)',
                }}
              />
              <span data-testid="connection-status" className="brand-text">
                {isOnline ? 'Local' : 'Offline'}
              </span>
            </div>
            <button
              onClick={toggleTheme}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--tita-text-muted)',
                padding: '10px',
                minWidth: 'var(--tita-touch-min)',
                minHeight: 'var(--tita-touch-min)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 'var(--tita-radius-sm)',
              }}
              title="Alternar tema"
              aria-label="Alternar tema claro e escuro"
            >
              {theme === 'dark' ? (
                <SunIcon size={18} color="var(--tita-text-muted)" />
              ) : (
                <MoonIcon size={18} color="var(--tita-text-muted)" />
              )}
            </button>
          </div>
          <button
            onClick={() => navigate('/legacy')}
            style={{
              fontSize: 'var(--tita-text-xs)',
              color: 'var(--tita-text-subtle)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              padding: '8px 0',
              minHeight: 'var(--tita-touch-min)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <ArrowLeftIcon size={14} color="var(--tita-text-subtle)" />
            <span className="brand-text">Versão Legada</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Header (Mobile & Tablet only — hidden on Desktop to avoid duplicate header) */}
        <header
          className="tita-top-header"
          style={{
            minHeight: '56px',
            padding: 'var(--tita-space-2) var(--tita-space-4)',
            borderBottom: '1px solid var(--tita-border)',
            backgroundColor: 'var(--tita-surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div
            className="tita-header-brand"
            style={{ display: 'flex', alignItems: 'center', gap: 'var(--tita-space-2)' }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--tita-radius-sm)',
                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.22)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <TitaBrandMonogram size={22} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span
                style={{
                  fontWeight: 'var(--tita-weight-extrabold)',
                  fontSize: 'var(--tita-text-base)',
                  fontFamily: 'var(--tita-font-display)',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  lineHeight: 1.1,
                  color: 'var(--tita-text)',
                }}
              >
                PROJETO TITÃ
              </span>
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: 'var(--tita-weight-bold)',
                  color: 'var(--tita-primary)',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                Treino &amp; Força
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--tita-space-2)' }}>
            <span
              data-testid="connection-status"
              style={{
                fontSize: 'var(--tita-text-xs)',
                color: 'var(--tita-text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: isOnline ? 'var(--tita-accent)' : 'var(--tita-warning)',
                }}
              />
              {isOnline ? 'Local' : 'Offline'}
            </span>
            <button
              onClick={toggleTheme}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--tita-text-muted)',
                padding: '8px',
                minWidth: 'var(--tita-touch-min)',
                minHeight: 'var(--tita-touch-min)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 'var(--tita-radius-sm)',
              }}
              title="Alternar tema"
              aria-label="Alternar tema claro e escuro"
            >
              {theme === 'dark' ? (
                <SunIcon size={18} color="var(--tita-text-muted)" />
              ) : (
                <MoonIcon size={18} color="var(--tita-text-muted)" />
              )}
            </button>
          </div>
        </header>

        {/* Main Content Viewport */}
        <main
          id="main-content"
          tabIndex={-1}
          style={{
            flex: 1,
            padding: 'var(--tita-space-4)',
            paddingBottom: 'calc(var(--tita-nav-height-mobile) + var(--tita-space-6))',
            maxWidth: 'var(--tita-workstation-max-width)',
            width: '100%',
            margin: '0 auto',
            outline: 'none',
          }}
        >
          {pwaState.isUpdateAvailable && (
            <div
              data-testid="pwa-update-banner"
              style={{
                marginBottom: 'var(--tita-space-4)',
                width: '100%',
              }}
            >
              {pwaState.isUpdateDeferred ? (
                <StatusBanner
                  variant="warning"
                  title="Atualização do Sistema"
                  message="Nova versão disponível — Atualizar após o treino."
                  action={{
                    label: 'Atualizar agora',
                    onClick: () => serviceWorkerManager.applyUpdate(),
                    testId: 'pwa-update-now-button',
                  }}
                  onDismiss={() => serviceWorkerManager.deferUpdate()}
                />
              ) : (
                <StatusBanner
                  variant="info"
                  title="Nova Versão Pronta"
                  message="Uma nova versão do Projeto Titã foi baixada e está pronta para uso."
                  action={{
                    label: 'Atualizar agora',
                    onClick: () => serviceWorkerManager.applyUpdate(),
                    testId: 'pwa-update-now-button',
                  }}
                />
              )}
            </div>
          )}
          <Outlet />
        </main>

        {/* Mobile Bottom Navigation Bar (≤ 768px) */}
        <nav
          aria-label="Navegação Inferior Mobile"
          className="tita-bottom-nav"
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: 'var(--tita-nav-height-mobile)',
            backgroundColor: 'var(--tita-surface)',
            borderTop: '1px solid var(--tita-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
            zIndex: 30,
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          }}
        >
          {NAV_ITEMS.map((item) => {
            const isActive = currentPath === item.path;
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                aria-current={isActive ? 'page' : undefined}
                aria-label={item.label}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  background: 'none',
                  border: 'none',
                  color: isActive ? 'var(--tita-primary)' : 'var(--tita-text-muted)',
                  cursor: 'pointer',
                  padding: 'var(--tita-space-1)',
                  minWidth: 'var(--tita-touch-min)',
                  minHeight: 'var(--tita-touch-min)',
                  flex: 1,
                  position: 'relative',
                  transition: 'color var(--tita-transition-fast)',
                }}
              >
                {isActive && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: '25%',
                      right: '25%',
                      height: '2px',
                      backgroundColor: 'var(--tita-primary)',
                      borderRadius: '1px',
                    }}
                  />
                )}
                <Icon
                  size={20}
                  color={isActive ? 'var(--tita-primary)' : 'var(--tita-text-muted)'}
                />
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: isActive ? 'var(--tita-weight-bold)' : 'var(--tita-weight-medium)',
                    letterSpacing: '0.01em',
                  }}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      <style>{`
        body[data-tita-focus-mode="true"] .tita-bottom-nav {
          display: none !important;
        }
        body[data-tita-focus-mode="true"] .tita-mobile-hud {
          bottom: 0 !important;
        }
        body[data-tita-focus-mode="true"] main {
          padding-bottom: 76px !important;
        }

        @media (min-width: 769px) {
          .tita-top-header {
            display: none !important;
          }
          .tita-sidebar {
            display: flex !important;
            width: var(--tita-nav-width-rail);
          }
          .tita-sidebar .brand-text,
          .tita-sidebar .nav-label {
            display: none;
          }
          .tita-bottom-nav {
            display: none !important;
          }
          main {
            padding-bottom: var(--tita-space-6) !important;
          }
        }

        @media (min-width: 1025px) {
          .tita-sidebar {
            width: var(--tita-nav-width-desktop) !important;
          }
          .tita-sidebar .brand-text,
          .tita-sidebar .nav-label {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
};
