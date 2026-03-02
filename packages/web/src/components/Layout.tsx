import { Outlet, useNavigate } from 'react-router-dom';
import Squares from './Squares';
import StaggeredMenu from './StaggeredMenu';
import DemoBanner from './DemoBanner';
import { useTheme, useAuth } from '../contexts';

const baseMenuItems = [
  { label: 'Dashboard', ariaLabel: 'Go to dashboard', link: '/' },
  { label: 'Crises', ariaLabel: 'View active crises', link: '/crises' },
  { label: 'Map', ariaLabel: 'Open map view', link: '/map' },
  { label: 'Alerts', ariaLabel: 'View alerts', link: '/alerts' },
];

const authMenuItems = [
  { label: 'Subscribe', ariaLabel: 'Subscribe to alerts', link: '/subscribe' },
  { label: 'Profile', ariaLabel: 'View your profile', link: '/profile' },
];

const resourceItems = [
  { label: 'OCHA', link: 'https://www.unocha.org' },
  { label: 'ReliefWeb', link: 'https://reliefweb.int' },
  { label: 'GDACS', link: 'https://gdacs.org' },
  { label: 'ACLED', link: 'https://acleddata.com' },
];

export default function Layout() {
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  const { isAuthenticated } = useAuth();
  const isDark = resolvedTheme === 'dark';

  // Add authenticated-only menu items when logged in
  const menuItems = isAuthenticated 
    ? [...baseMenuItems, ...authMenuItems]
    : baseMenuItems;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-blue-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/30">
      {/* Staggered Menu */}
      <StaggeredMenu
        position="right"
        items={menuItems}
        socialItems={resourceItems}
        displaySocials={true}
        displayItemNumbering={true}
        menuButtonColor={isDark ? '#e2e8f0' : '#334155'}
        openMenuButtonColor={isDark ? '#e2e8f0' : '#334155'}
        changeMenuColorOnOpen={true}
        colors={isDark ? ['#1e3a5f', '#2563eb', '#1d4ed8'] : ['#dbeafe', '#60a5fa', '#3b82f6']}
        accentColor="#3b82f6"
        isFixed={true}
        onNavigate={(link) => navigate(link)}
      />

      {/* Main content */}
      <div className="min-h-screen flex flex-col relative">
        {/* Animated Squares Background */}
        <div className="fixed inset-0 z-0 overflow-hidden">
          <Squares 
            direction="diagonal"
            speed={0.4}
            borderColor={isDark ? '#334155' : '#cbd5e1'}
            squareSize={45}
            hoverFillColor={isDark ? '#1e3a5f' : '#bfdbfe'}
          />
        </div>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 pt-24 animate-fade-in relative z-10">
          <div className="max-w-7xl pt-11 mx-auto">
            {/* Demo Banner */}
            <DemoBanner />
            <Outlet />
          </div>
        </main>

        {/* Footer */}
        <footer className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 relative z-10 backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-slate-500 dark:text-slate-400">
            <p>© 2026 AidWatch. Humanitarian Crisis Monitoring.</p>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Live Data
              </span>
              <span>v0.1.0</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
