import React from 'react';
import { Radar, Bell, Settings, User } from 'lucide-react';

export const Navbar: React.FC = () => {
  return (
    <nav className="h-16 bg-aid-panel border-b border-gray-700 flex items-center justify-between px-6 z-50 relative shadow-md">
      <div className="flex items-center gap-3">
        <div className="bg-aid-accent/20 p-2 rounded-lg">
          <Radar className="text-aid-accent w-6 h-6 animate-pulse-slow" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Aid<span className="text-aid-accent">Watch</span></h1>
          <p className="text-[10px] text-gray-400 uppercase tracking-widest">Global Crisis Monitor</p>
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-sm text-gray-400 bg-black/20 px-3 py-1 rounded-full border border-gray-700">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          System Operational
        </div>
        
        <button className="text-gray-400 hover:text-white transition-colors relative">
          <Bell className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-aid-alert rounded-full"></span>
        </button>
        <button className="text-gray-400 hover:text-white transition-colors">
          <Settings className="w-5 h-5" />
        </button>
        <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-xs font-bold ring-2 ring-gray-700">
          OP
        </div>
      </div>
    </nav>
  );
};