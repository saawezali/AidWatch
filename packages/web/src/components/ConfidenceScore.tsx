import { AlertTriangle, CheckCircle, HelpCircle, Info } from 'lucide-react';

interface ConfidenceScoreProps {
  score: number; // 0 to 1
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

function getConfidenceLevel(score: number): {
  label: string;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
} {
  if (score >= 0.8) {
    return {
      label: 'High Confidence',
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      icon: <CheckCircle className="w-4 h-4" />,
    };
  }
  if (score >= 0.6) {
    return {
      label: 'Moderate Confidence',
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
      icon: <Info className="w-4 h-4" />,
    };
  }
  if (score >= 0.4) {
    return {
      label: 'Low Confidence',
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-100 dark:bg-orange-900/30',
      icon: <AlertTriangle className="w-4 h-4" />,
    };
  }
  return {
    label: 'Uncertain',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    icon: <HelpCircle className="w-4 h-4" />,
  };
}

const sizeClasses = {
  sm: {
    container: 'h-1.5',
    text: 'text-xs',
    badge: 'px-1.5 py-0.5 text-xs',
  },
  md: {
    container: 'h-2',
    text: 'text-sm',
    badge: 'px-2 py-1 text-sm',
  },
  lg: {
    container: 'h-3',
    text: 'text-base',
    badge: 'px-3 py-1.5 text-base',
  },
};

export default function ConfidenceScore({
  score,
  showLabel = true,
  size = 'md',
  className = '',
}: ConfidenceScoreProps) {
  const level = getConfidenceLevel(score);
  const sizes = sizeClasses[size];
  const percentage = Math.round(score * 100);

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {showLabel && (
        <div className="flex items-center justify-between">
          <span className={`font-medium ${level.color} ${sizes.text} flex items-center gap-1`}>
            {level.icon}
            {level.label}
          </span>
          <span className={`${sizes.text} text-slate-500 dark:text-slate-400`}>
            {percentage}%
          </span>
        </div>
      )}
      
      {/* Progress bar */}
      <div className={`w-full ${sizes.container} bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden`}>
        <div
          className={`h-full transition-all duration-500 ease-out rounded-full ${
            score >= 0.8 ? 'bg-green-500' :
            score >= 0.6 ? 'bg-yellow-500' :
            score >= 0.4 ? 'bg-orange-500' :
            'bg-red-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// Badge variant for inline use
export function ConfidenceBadge({
  score,
  size = 'sm',
  className = '',
}: ConfidenceScoreProps) {
  const level = getConfidenceLevel(score);
  const sizes = sizeClasses[size];
  const percentage = Math.round(score * 100);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${level.bgColor} ${level.color} ${sizes.badge} ${className}`}
      title={`${level.label}: ${percentage}% confidence`}
    >
      {level.icon}
      <span>{percentage}%</span>
    </span>
  );
}
