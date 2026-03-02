import { Eye, X, LogIn } from 'lucide-react';
import { useState } from 'react';
import { useDemoMode } from '../contexts';

export default function DemoBanner() {
  const { isDemo } = useDemoMode();
  const [dismissed, setDismissed] = useState(false);

  if (!isDemo || dismissed) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 text-white px-4 py-2 rounded-lg mb-4 shadow-md">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Eye className="w-4 h-4 shrink-0" />
          <p className="text-sm">
            <span className="font-semibold">Demo Mode</span>
            <span className="hidden sm:inline">
              {' '}- You're viewing AidWatch in read-only mode.{' '}
              <span className="inline-flex items-center gap-1">
                <LogIn className="w-3 h-3" />
                Sign in via the menu to unlock all features.
              </span>
            </span>
            <span className="sm:hidden">
              {' '}- Sign in to unlock features
            </span>
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 hover:bg-white/10 rounded transition-colors"
          aria-label="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
