import { Eye, X } from 'lucide-react';
import { useState } from 'react';
import { useDemoMode } from '../contexts';

export default function DemoBanner() {
  const { isDemo } = useDemoMode();
  const [dismissed, setDismissed] = useState(false);

  if (!isDemo || dismissed) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 text-white px-4 py-2 relative z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Eye className="w-4 h-4 shrink-0" />
          <p className="text-sm">
            <span className="font-semibold">Demo Mode</span>
            <span className="hidden sm:inline">
              {' '}- You're viewing AidWatch in read-only mode. Data modifications are disabled.
            </span>
            <span className="sm:hidden">
              {' '}- Read-only mode
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
