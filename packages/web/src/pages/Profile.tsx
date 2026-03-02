import { useState } from 'react';
import { User, Mail, Shield, Calendar, Save, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts';
import { api } from '../lib/api';

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500 dark:text-slate-400">Please log in to view your profile.</p>
      </div>
    );
  }

  const handleSave = async () => {
    if (!name.trim() || name === user.name) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      await api.patch('/auth/profile', { name: name.trim() });
      await refreshUser();
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setIsEditing(false);
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } } };
      setMessage({ 
        type: 'error', 
        text: err.response?.data?.error || 'Failed to update profile' 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const styles: Record<string, string> = {
      ADMIN: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
      ANALYST: 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
      RESPONDER: 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
      VIEWER: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600',
    };
    return styles[role] || styles.VIEWER;
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6">Profile</h1>

      {/* Message */}
      {message && (
        <div className={`flex items-center gap-2 p-3 rounded-lg mb-6 ${
          message.type === 'success' 
            ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800' 
            : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span className="text-sm">{message.text}</span>
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
        {/* Avatar */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">{user.name}</h2>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getRoleBadge(user.role)}`}>
              <Shield className="w-3 h-3" />
              {user.role}
            </span>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
              <User className="w-4 h-4" />
              Full Name
            </label>
            {isEditing ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg flex items-center gap-2"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save
                </button>
                <button
                  onClick={() => { setIsEditing(false); setName(user.name); }}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-700 dark:text-slate-200 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-slate-800 dark:text-slate-200">{user.name}</span>
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Edit
                </button>
              </div>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
              <Mail className="w-4 h-4" />
              Email Address
            </label>
            <span className="text-slate-800 dark:text-slate-200">{user.email}</span>
          </div>

          {/* Member Since */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
              <Calendar className="w-4 h-4" />
              Member Since
            </label>
            <span className="text-slate-800 dark:text-slate-200">
              {new Date(user.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Account Features */}
      <div className="mt-6 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Account Features</h3>
        <ul className="space-y-3 text-sm">
          <li className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <CheckCircle className="w-4 h-4 text-green-500" />
            Subscribe to email alerts for specific regions
          </li>
          <li className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <CheckCircle className="w-4 h-4 text-green-500" />
            Configure alert frequency (immediate, daily, weekly)
          </li>
          <li className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <CheckCircle className="w-4 h-4 text-green-500" />
            Filter by crisis severity and type
          </li>
        </ul>
      </div>
    </div>
  );
}
