import { LogOut, User as UserIcon, Shield, Bell } from 'lucide-react';
import { useAuth } from '../contexts';

interface UserMenuProps {
  onLogout?: () => void;
  onNavigate?: (link: string) => void;
}

export default function UserMenu({ onLogout, onNavigate }: UserMenuProps) {
  const { user, logout, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    onLogout?.();
  };

  const handleNavigate = (link: string) => {
    onNavigate?.(link);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300';
      case 'ANALYST':
        return 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300';
      case 'RESPONDER':
        return 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300';
      default:
        return 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300';
    }
  };

  return (
    <div className="space-y-4">
      {/* User info */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
            {user.name}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {user.email}
          </p>
        </div>
      </div>

      {/* Role badge */}
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
          {user.role === 'ADMIN' && <Shield className="w-3 h-3" />}
          {user.role}
        </span>
      </div>

      {/* Actions */}
      <div className="border-t border-slate-200 dark:border-slate-700 pt-4 space-y-2">
        <button
          onClick={() => handleNavigate('/profile')}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
        >
          <UserIcon className="w-4 h-4" />
          <span>Profile</span>
        </button>
        <button
          onClick={() => handleNavigate('/subscribe')}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
        >
          <Bell className="w-4 h-4" />
          <span>Alert Subscriptions</span>
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
