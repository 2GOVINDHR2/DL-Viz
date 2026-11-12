/** The learning interface's frame: header with primary navigation, breadcrumbs, main region, footer. */
import { useEffect, useState, type ReactNode } from 'react';
import { href, type Route } from './router';
import { level1ById } from '../experiments/level1';

type Theme = 'system' | 'light' | 'dark';
const THEME_KEY = 'dl-vizlab.theme.v1';

function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const t = globalThis.localStorage?.getItem(THEME_KEY);
      return t === 'light' || t === 'dark' ? t : 'system';
    } catch {
      return 'system';
    }
  });
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
    try {
      globalThis.localStorage?.setItem(THEME_KEY, theme);
    } catch {
      // A preference only; without storage it lasts for this page.
    }
  }, [theme]);
  return [theme, setTheme];
}

export function crumbs(route: Route): { label: string; href?: string }[] {
  const base = [{ label: 'Home', href: href.home }];
  const levels = [...base, { label: 'Learning levels', href: href.levels }];
  const l1 = [...levels, { label: 'Level 1', href: href.level1 }];
  switch (route.page) {
    case 'home':
      return [{ label: 'Home' }];
    case 'levels':
      return [...base, { label: 'Learning levels' }];
    case 'level':
      return [...levels, { label: 'Level 1' }];
    case 'orientation':
      return [...l1, { label: 'Orientation' }];
    case 'assessment':
      return [...l1, { label: 'Assessment' }];
    case 'experiment': {
      const e = level1ById(route.id);
      return [...l1, { label: e ? `Experiment ${e.id}` : 'Experiment' }];
    }
    case 'notFound':
      return [...base, { label: 'Not found' }];
  }
}

export function Shell({ route, children }: { route: Route; children: ReactNode }) {
  const [theme, setTheme] = useTheme();
  const section = route.page === 'home' ? 'home' : route.page === 'levels' ? 'levels' : 'level1';
  const trail = crumbs(route);
  return (
    <div className="lv-root">
      <a
        className="lv-skip"
        href="#lv-main"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById('lv-main')?.focus();
        }}
      >
        Skip to content
      </a>
      <header className="lv-header">
        <div className="lv-header-inner">
          <a className="lv-brand" href={href.home}>
            <svg className="lv-brand-mark" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="5" cy="7" r="3" fill="var(--lv-input)" />
              <circle cx="5" cy="17" r="3" fill="var(--lv-input)" />
              <circle cx="19" cy="12" r="3.5" fill="none" stroke="var(--lv-text)" strokeWidth="2" />
              <path d="M8 7.5 15.6 11.3M8 16.5l7.6-3.8" stroke="var(--lv-weight)" strokeWidth="2" />
            </svg>
            DL-VizLab
          </a>
          <nav className="lv-nav" aria-label="Main">
            <a href={href.home} aria-current={section === 'home' ? 'page' : undefined}>
              Home
            </a>
            <a href={href.levels} aria-current={section === 'levels' ? 'page' : undefined}>
              Learning levels
            </a>
            <a href={href.level1} aria-current={section === 'level1' ? 'page' : undefined}>
              Level 1
            </a>
            <label className="lv-small lv-row" style={{ gap: 6, marginLeft: 8 }}>
              <span className="lv-muted">Theme</span>
              <select
                className="lv-select"
                value={theme}
                onChange={(e) => setTheme(e.target.value as Theme)}
                data-control="theme"
              >
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
          </nav>
        </div>
      </header>
      <main id="lv-main" className="lv-main" tabIndex={-1}>
        {trail.length > 1 && (
          <nav className="lv-crumbs" aria-label="Breadcrumb">
            <ol>
              {trail.map((c, i) => (
                <li key={i}>
                  {c.href && i < trail.length - 1 ? (
                    <a href={c.href}>{c.label}</a>
                  ) : (
                    <span aria-current="page">{c.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}
        {children}
      </main>
      <footer className="lv-footer">
        <div className="lv-footer-inner">
          <span>Everything runs in your browser: no account, no server, nothing sent anywhere.</span>
          <span>
            Every number labelled “Computed by the engine” comes from a real run of the DL-VizLab engine.
          </span>
        </div>
      </footer>
    </div>
  );
}
