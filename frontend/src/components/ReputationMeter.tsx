'use client';

interface ReputationMeterProps {
  score: number; // 0-100
  tier?: string;
  color?: string;
  stars?: number;
  badge?: string;
  showDetails?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export default function ReputationMeter({
  score,
  tier,
  color,
  stars = 0,
  badge,
  showDetails = false,
  size = 'medium',
}: ReputationMeterProps) {
  // Auto-calculate tier info if not provided
  const getTierInfo = (s: number) => {
    if (s <= 20) return { tier: 'New', color: '#9CA3AF', stars: 1, badge: '⭐' };
    if (s <= 40) return { tier: 'Emerging', color: '#3B82F6', stars: 2, badge: '⭐⭐' };
    if (s <= 60) return { tier: 'Reliable', color: '#10B981', stars: 3, badge: '⭐⭐⭐' };
    if (s <= 80) return { tier: 'Trusted', color: '#F59E0B', stars: 4, badge: '⭐⭐⭐⭐' };
    return { tier: 'Expert', color: '#8B5CF6', stars: 5, badge: '⭐⭐⭐⭐⭐' };
  };

  const info = tier && color ? { tier, color, stars, badge } : getTierInfo(score);

  const sizes = {
    small: { height: 'h-2', text: 'text-xs', badge: 'text-sm' },
    medium: { height: 'h-3', text: 'text-sm', badge: 'text-base' },
    large: { height: 'h-4', text: 'text-base', badge: 'text-lg' },
  };

  const sizeClass = sizes[size];

  return (
    <div className="flex items-center gap-2">
      {/* Circular progress ring */}
      {size === 'large' && (
        <div className="relative w-16 h-16 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90">
            {/* Background circle */}
            <circle
              cx="32"
              cy="32"
              r="28"
              stroke="#E5E7EB"
              strokeWidth="6"
              fill="none"
            />
            {/* Progress circle */}
            <circle
              cx="32"
              cy="32"
              r="28"
              stroke={info.color}
              strokeWidth="6"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 28}`}
              strokeDashoffset={`${2 * Math.PI * 28 * (1 - score / 100)}`}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-bold" style={{ color: info.color }}>
              {Math.round(score)}
            </span>
          </div>
        </div>
      )}

      {/* Linear progress bar for small/medium */}
      {size !== 'large' && (
        <div className="flex-1 min-w-[60px]">
          <div className={`w-full ${sizeClass.height} bg-gray-200 rounded-full overflow-hidden`}>
            <div
              className={`${sizeClass.height} rounded-full transition-all duration-500`}
              style={{
                width: `${score}%`,
                backgroundColor: info.color,
              }}
            />
          </div>
        </div>
      )}

      {/* Tier badge */}
      <div className="flex items-center gap-1">
        {badge && (
          <span className={sizeClass.badge} title={`${info.tier} (${Math.round(score)}/100)`}>
            {badge}
          </span>
        )}
        {showDetails && (
          <div className="flex flex-col">
            <span className={`${sizeClass.text} font-medium`} style={{ color: info.color }}>
              {info.tier}
            </span>
            <span className={`text-xs text-gray-500`}>{Math.round(score)}/100</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Compact reputation badge for user avatars
 */
export function ReputationBadge({ score, size = 'small' }: { score: number; size?: 'small' | 'medium' }) {
  const getTierBadge = (s: number) => {
    if (s <= 20) return { badge: '⭐', color: '#9CA3AF' };
    if (s <= 40) return { badge: '⭐⭐', color: '#3B82F6' };
    if (s <= 60) return { badge: '⭐⭐⭐', color: '#10B981' };
    if (s <= 80) return { badge: '⭐⭐⭐⭐', color: '#F59E0B' };
    return { badge: '⭐⭐⭐⭐⭐', color: '#8B5CF6' };
  };

  const info = getTierBadge(score);
  const badgeSize = size === 'small' ? 'text-xs px-1' : 'text-sm px-1.5';

  return (
    <span
      className={`inline-flex items-center justify-center ${badgeSize} rounded font-medium text-white shadow-sm`}
      style={{ backgroundColor: info.color }}
      title={`Reliability: ${Math.round(score)}/100`}
    >
      {info.badge}
    </span>
  );
}

/**
 * Detailed reputation card
 */
export function ReputationCard({
  score,
  tier,
  color,
  totalViews,
  totalLikes,
  totalDislikes,
  engagementRate,
  postCount,
}: {
  score: number;
  tier?: string;
  color?: string;
  totalViews?: number;
  totalLikes?: number;
  totalDislikes?: number;
  engagementRate?: string;
  postCount?: number;
}) {
  const getTierInfo = (s: number) => {
    if (s <= 20) return { tier: 'New', color: '#9CA3AF', stars: 1, badge: '⭐' };
    if (s <= 40) return { tier: 'Emerging', color: '#3B82F6', stars: 2, badge: '⭐⭐' };
    if (s <= 60) return { tier: 'Reliable', color: '#10B981', stars: 3, badge: '⭐⭐⭐' };
    if (s <= 80) return { tier: 'Trusted', color: '#F59E0B', stars: 4, badge: '⭐⭐⭐⭐' };
    return { tier: 'Expert', color: '#8B5CF6', stars: 5, badge: '⭐⭐⭐⭐⭐' };
  };

  const info = tier && color ? { tier, color } : getTierInfo(score);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Reputation</h3>
        <span className="text-2xl">{getTierInfo(score).badge}</span>
      </div>

      <ReputationMeter score={score} tier={info.tier} color={info.color} size="large" showDetails />

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        {postCount !== undefined && (
          <div className="bg-gray-50 rounded p-2">
            <div className="text-gray-500">Posts</div>
            <div className="font-semibold text-gray-800">{postCount}</div>
          </div>
        )}
        {totalViews !== undefined && (
          <div className="bg-gray-50 rounded p-2">
            <div className="text-gray-500">Views</div>
            <div className="font-semibold text-gray-800">{totalViews.toLocaleString()}</div>
          </div>
        )}
        {totalLikes !== undefined && (
          <div className="bg-green-50 rounded p-2">
            <div className="text-green-600">Likes</div>
            <div className="font-semibold text-green-800">{totalLikes}</div>
          </div>
        )}
        {totalDislikes !== undefined && (
          <div className="bg-red-50 rounded p-2">
            <div className="text-red-600">Dislikes</div>
            <div className="font-semibold text-red-800">{totalDislikes}</div>
          </div>
        )}
      </div>

      {engagementRate && (
        <div className="mt-3 text-center">
          <div className="text-xs text-gray-500">Engagement Rate</div>
          <div className="text-sm font-semibold" style={{ color: info.color }}>
            {engagementRate}
          </div>
        </div>
      )}
    </div>
  );
}
