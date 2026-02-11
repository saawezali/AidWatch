import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  Bell, 
  MapPin, 
  Mail, 
  CheckCircle2, 
  AlertCircle,
  Globe,
  Clock,
  Shield,
  Zap,
  ChevronDown,
  ChevronUp,
  X,
  Waves,
  Droplets,
  Flame,
  Sun,
  CloudLightning,
  Bug,
  Swords,
  Users,
  Utensils,
  Building2,
  type LucideIcon
} from 'lucide-react';
import { subscriptionsApi, SubscriptionData } from '../lib/api';
import clsx from 'clsx';

const CRISIS_TYPES: { value: string; label: string; icon: LucideIcon }[] = [
  { value: 'earthquake', label: 'Earthquakes', icon: Waves },
  { value: 'flood', label: 'Floods', icon: Droplets },
  { value: 'wildfire', label: 'Wildfires', icon: Flame },
  { value: 'drought', label: 'Droughts', icon: Sun },
  { value: 'storm', label: 'Storms & Hurricanes', icon: CloudLightning },
  { value: 'disease', label: 'Disease Outbreaks', icon: Bug },
  { value: 'conflict', label: 'Conflict & Violence', icon: Swords },
  { value: 'displacement', label: 'Displacement', icon: Users },
  { value: 'famine', label: 'Food Insecurity', icon: Utensils },
  { value: 'infrastructure', label: 'Infrastructure', icon: Building2 },
];

const FREQUENCY_OPTIONS = [
  { 
    value: 'IMMEDIATE', 
    label: 'Immediate', 
    description: 'Get notified as soon as a crisis is detected',
    icon: Zap 
  },
  { 
    value: 'DAILY', 
    label: 'Daily Digest', 
    description: 'Receive a daily summary at 8 AM UTC',
    icon: Clock 
  },
  { 
    value: 'WEEKLY', 
    label: 'Weekly Digest', 
    description: 'Receive a weekly summary every Monday',
    icon: Clock 
  },
];

const SEVERITY_LEVELS = [
  { value: 1, label: 'All Alerts', description: 'Including low severity' },
  { value: 2, label: 'Moderate+', description: 'Severity 2 and above' },
  { value: 3, label: 'Significant+', description: 'Severity 3 and above' },
  { value: 4, label: 'High+', description: 'Severity 4 and above' },
  { value: 5, label: 'Critical Only', description: 'Only severity 5' },
];

export default function Subscribe() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedCrisisTypes, setSelectedCrisisTypes] = useState<string[]>([]);
  const [frequency, setFrequency] = useState<'IMMEDIATE' | 'DAILY' | 'WEEKLY'>('DAILY');
  const [minSeverity, setMinSeverity] = useState(3);
  const [showRegionDropdown, setShowRegionDropdown] = useState(false);
  const [regionSearch, setRegionSearch] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch available regions
  const { data: regionsData } = useQuery({
    queryKey: ['subscription-regions'],
    queryFn: subscriptionsApi.getRegions,
  });

  const regions: string[] = regionsData?.regions || [];
  const filteredRegions = regions.filter(r => 
    r.toLowerCase().includes(regionSearch.toLowerCase())
  );

  // Subscribe mutation
  const subscribeMutation = useMutation({
    mutationFn: subscriptionsApi.create,
    onSuccess: () => {
      setSubmitted(true);
      setError(null);
    },
    onError: (err: Error & { response?: { data?: { error?: string } } }) => {
      setError(err.response?.data?.error || 'Failed to subscribe. Please try again.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    const data: SubscriptionData = {
      email,
      name: name || undefined,
      regions: selectedRegions,
      crisisTypes: selectedCrisisTypes,
      minSeverity,
      frequency,
    };

    subscribeMutation.mutate(data);
  };

  const toggleRegion = (region: string) => {
    setSelectedRegions(prev => 
      prev.includes(region) 
        ? prev.filter(r => r !== region)
        : [...prev, region]
    );
  };

  const toggleCrisisType = (type: string) => {
    setSelectedCrisisTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-semibold text-slate-900 mb-3">
            Check Your Inbox
          </h2>
          <p className="text-slate-600 mb-6">
            We've sent a verification email to <strong>{email}</strong>. 
            Please click the link in the email to activate your subscription.
          </p>
          <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-800">
            <Mail className="h-5 w-5 inline-block mr-2" />
            Didn't receive the email? Check your spam folder or try again in a few minutes.
          </div>
          <button
            onClick={() => {
              setSubmitted(false);
              setEmail('');
              setName('');
              setSelectedRegions([]);
              setSelectedCrisisTypes([]);
            }}
            className="mt-6 text-primary-600 hover:text-primary-700 font-medium"
          >
            Subscribe another email
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 mt-12">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 text-white mb-6 shadow-lg shadow-primary-500/25">
          <Bell className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-3">
          Subscribe to Crisis Alerts
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Get notified when humanitarian crises emerge in regions you care about. 
          Stay informed and be ready to respond.
        </p>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Globe className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-medium text-slate-900">Global Coverage</h3>
            <p className="text-sm text-slate-500">50+ countries monitored 24/7</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-3">
          <div className="p-2 bg-amber-100 rounded-lg">
            <Zap className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-medium text-slate-900">AI-Powered</h3>
            <p className="text-sm text-slate-500">Early detection with ML models</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <Shield className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <h3 className="font-medium text-slate-900">Privacy First</h3>
            <p className="text-sm text-slate-500">Unsubscribe anytime, no spam</p>
          </div>
        </div>
      </div>

      {/* Subscription Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {/* Email & Name */}
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Your Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@organization.org"
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Name (optional)
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
        </div>

        {/* Regions */}
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">
            <MapPin className="h-5 w-5 inline-block mr-2 text-primary-500" />
            Regions of Interest
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            Select specific regions to monitor, or leave empty to receive alerts for all regions.
          </p>
          
          {/* Selected Regions */}
          {selectedRegions.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {selectedRegions.map((region) => (
                <span
                  key={region}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm"
                >
                  {region}
                  <button
                    type="button"
                    onClick={() => toggleRegion(region)}
                    className="hover:bg-primary-200 rounded-full p-0.5"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Region Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowRegionDropdown(!showRegionDropdown)}
              className="w-full flex items-center justify-between px-4 py-2.5 border border-slate-300 rounded-lg text-left hover:bg-slate-50"
            >
              <span className="text-slate-600">
                {selectedRegions.length === 0 
                  ? 'All regions (click to filter)' 
                  : `${selectedRegions.length} region${selectedRegions.length > 1 ? 's' : ''} selected`
                }
              </span>
              {showRegionDropdown ? (
                <ChevronUp className="h-5 w-5 text-slate-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-slate-400" />
              )}
            </button>

            {showRegionDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-hidden">
                <div className="p-2 border-b border-slate-100">
                  <input
                    type="text"
                    value={regionSearch}
                    onChange={(e) => setRegionSearch(e.target.value)}
                    placeholder="Search regions..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div className="overflow-y-auto max-h-48">
                  {filteredRegions.map((region) => (
                    <button
                      key={region}
                      type="button"
                      onClick={() => toggleRegion(region)}
                      className={clsx(
                        'w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center justify-between',
                        selectedRegions.includes(region) && 'bg-primary-50 text-primary-700'
                      )}
                    >
                      {region}
                      {selectedRegions.includes(region) && (
                        <CheckCircle2 className="h-4 w-4 text-primary-500" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Crisis Types */}
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">
            <AlertCircle className="h-5 w-5 inline-block mr-2 text-amber-500" />
            Crisis Types
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            Select specific crisis types, or leave empty to receive alerts for all types.
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {CRISIS_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => toggleCrisisType(type.value)}
                className={clsx(
                  'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all',
                  selectedCrisisTypes.includes(type.value)
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600'
                )}
              >
                <type.icon className="h-4 w-4" />
                <span>{type.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Frequency & Severity */}
        <div className="p-6 border-b border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Frequency */}
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">
                <Clock className="h-5 w-5 inline-block mr-2 text-green-500" />
                Notification Frequency
              </h2>
              <div className="space-y-2">
                {FREQUENCY_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className={clsx(
                        'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                        frequency === option.value
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-slate-200 hover:border-slate-300'
                      )}
                    >
                      <input
                        type="radio"
                        name="frequency"
                        value={option.value}
                        checked={frequency === option.value}
                        onChange={(e) => setFrequency(e.target.value as 'IMMEDIATE' | 'DAILY' | 'WEEKLY')}
                        className="mt-0.5"
                      />
                      <div>
                        <div className="font-medium text-slate-900">
                          <option.icon className="h-4 w-4 inline-block mr-1" />
                          {option.label}
                        </div>
                        <div className="text-sm text-slate-500">{option.description}</div>
                      </div>
                    </label>
                  ))}
              </div>
            </div>

            {/* Severity */}
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">
                <Shield className="h-5 w-5 inline-block mr-2 text-red-500" />
                Minimum Severity
              </h2>
              <div className="space-y-2">
                {SEVERITY_LEVELS.map((level) => (
                  <label
                    key={level.value}
                    className={clsx(
                      'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                      minSeverity === level.value
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <input
                      type="radio"
                      name="severity"
                      value={level.value}
                      checked={minSeverity === level.value}
                      onChange={(e) => setMinSeverity(parseInt(e.target.value))}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="font-medium text-slate-900">{level.label}</div>
                      <div className="text-sm text-slate-500">{level.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="p-6 bg-slate-50">
          <button
            type="submit"
            disabled={subscribeMutation.isPending}
            className="w-full py-3 px-6 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-500/25"
          >
            {subscribeMutation.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Subscribing...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Bell className="h-5 w-5" />
                Subscribe to Alerts
              </span>
            )}
          </button>
          <p className="text-center text-sm text-slate-500 mt-3">
            You'll receive a verification email. No spam, unsubscribe anytime.
          </p>
        </div>
      </form>
    </div>
  );
}
