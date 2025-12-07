# Reliability-Based Reputation System

## Complete Algorithm Documentation

### 1. Mathematical Formula for Reliability Score

#### Base Formula:
```
R = 50 + (PositiveWeight - NegativeWeight) × ScalingFactor
```

Where:
- **R** = Reliability Score (clamped to 0-100)
- **PositiveWeight** = Σ(likes_i / max(views_i, 1)) × TimeDecay_i
- **NegativeWeight** = Σ(dislikes_i / max(views_i, 1)) × TimeDecay_i
- **ScalingFactor** = 50 / (1 + TotalEngagement/100)

#### Time Decay Function:
```
TimeDecay(post) = e^(-λ × age_days)
where λ = 0.01
```

**Decay Examples:**
- 1 day old: 0.99x weight
- 7 days old: 0.93x weight
- 30 days old: 0.74x weight
- 90 days old: 0.41x weight
- 365 days old: 0.003x weight

### 2. Normalization Logic

#### Sigmoid Normalization:
```
S(x) = 100 / (1 + e^(-(x-50)/10))
```

This ensures:
- **Bounded Range**: Score always stays between 0-100
- **Smooth Transitions**: No sudden jumps
- **Fair Scaling**: Large and small accounts treated equally
- **New Users**: Start at 50 (neutral)

#### Engagement Ratio:
```
EngagementRatio = (likes - dislikes) / max(views, 1)
```

**Minimum Threshold**: Posts need at least 3 views to affect score

### 3. Decay Rules

#### Exponential Time Decay:
- **Purpose**: Older posts have less influence on current reputation
- **Formula**: weight = e^(-0.01 × days_old)
- **Effect**: Natural degradation over time

#### Examples:
| Post Age | Influence |
|----------|-----------|
| Fresh (< 1 day) | 100% |
| 1 week | 93% |
| 1 month | 74% |
| 3 months | 41% |
| 6 months | 17% |
| 1 year | 0.3% |

### 4. Spam & Bot Protection

#### Rate Limiting:
- **Per User**: Max 50 reactions per hour
- **Per Post**: Only 1 reaction change per user per hour
- **Penalty**: Users exceeding limits get 0.1x weight (90% penalty)

#### Spike Detection:
```
if (recent_engagement_rate > normal_rate × 10):
    apply 0.5x weight modifier
```

**Normal Engagement Rate**: ~10% (likes + dislikes / views)

#### Bot Detection Flags:
1. **Rapid Reactions**: > 50 reactions in 1 hour
2. **Unusual Patterns**: Engagement 10x above normal
3. **Coordinated Activity**: Multiple users reacting simultaneously

#### Minimum View Threshold:
- Posts with < 3 views don't affect reputation
- Prevents manipulation through low-visibility posts

### 5. UI Representation Guidelines

#### Score Tiers:

| Tier | Score Range | Stars | Color | Hex Code | Badge |
|------|-------------|-------|-------|----------|-------|
| **New** | 0-20 | ⭐ | Gray | #9CA3AF | Beginner user |
| **Emerging** | 21-40 | ⭐⭐ | Blue | #3B82F6 | Growing reputation |
| **Reliable** | 41-60 | ⭐⭐⭐ | Green | #10B981 | Trusted contributor |
| **Trusted** | 61-80 | ⭐⭐⭐⭐ | Yellow | #F59E0B | Highly regarded |
| **Expert** | 81-100 | ⭐⭐⭐⭐⭐ | Purple | #8B5CF6 | Top authority |

#### Visual Components:

**1. Circular Progress Ring** (for profiles/large display):
```tsx
- Diameter: 64px
- Stroke width: 6px
- Background: #E5E7EB (gray)
- Progress: Tier color
- Center: Score number
```

**2. Linear Progress Bar** (for compact/inline display):
```tsx
- Width: 60-100px
- Height: 8-12px
- Border radius: Full (pill shape)
- Fill: Tier color
- Background: #E5E7EB
```

**3. Badge Display** (for avatars/thumbnails):
```tsx
- Stars: Unicode emoji ⭐
- Background: Tier color
- Text: White
- Size: 12-16px
- Shadow: Subtle
```

### 6. Implementation Steps

#### Step 1: Database Schema
```sql
-- Add to User table
ALTER TABLE users ADD COLUMN reliabilityScore FLOAT DEFAULT 50.0;
ALTER TABLE users ADD COLUMN totalViews INT DEFAULT 0;
ALTER TABLE users ADD COLUMN totalLikes INT DEFAULT 0;
ALTER TABLE users ADD COLUMN totalDislikes INT DEFAULT 0;

-- Add to Post table
ALTER TABLE posts ADD COLUMN viewCount INT DEFAULT 0;
ALTER TABLE posts ADD COLUMN likeCount INT DEFAULT 0;
ALTER TABLE posts ADD COLUMN dislikeCount INT DEFAULT 0;

-- Create Reactions table
CREATE TABLE post_reactions (
  id VARCHAR PRIMARY KEY,
  userId VARCHAR NOT NULL,
  postId VARCHAR NOT NULL,
  type VARCHAR NOT NULL, -- 'like' or 'dislike'
  createdAt TIMESTAMP DEFAULT NOW(),
  UNIQUE(userId, postId),
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (postId) REFERENCES posts(id) ON DELETE CASCADE
);
```

#### Step 2: Backend Service Implementation
1. ✅ Created `ReputationService` with full algorithm
2. ✅ Implemented time decay calculation
3. ✅ Added spam/bot detection
4. ✅ Created reaction management endpoints

#### Step 3: Frontend Components
1. ✅ Created `ReputationMeter` component (3 sizes)
2. ✅ Created `ReputationBadge` for compact display
3. ✅ Created `ReputationCard` for detailed view

#### Step 4: Integration Points
- Add `<ReputationBadge>` next to usernames
- Add `<ReputationMeter>` in user profiles
- Track views when posts are displayed
- Add like/dislike buttons to posts
- Show reputation changes in real-time

### 7. Usage Examples

#### Example 1: New User Journey
```
Day 0: User joins → Score = 50 (Reliable ⭐⭐⭐)
Day 1: Posts 3 messages → 50 views, 10 likes, 2 dislikes
  Engagement ratio: (10-2)/50 = 0.16
  Positive weight: 0.16 × 0.99 (decay) = 0.158
  Score: 50 + (0.158 × scaling) ≈ 52

Day 7: Consistent quality content → Score = 58 (Reliable ⭐⭐⭐)
Day 30: Community trusted → Score = 67 (Trusted ⭐⭐⭐⭐)
```

#### Example 2: Viral Post Impact
```
User posts viral content:
- 10,000 views
- 2,000 likes
- 100 dislikes

Engagement ratio: (2000-100)/10000 = 0.19
Time decay: 1.0 (fresh)
Scaling factor: 50/(1 + 2100/100) = 2.27

Score increase: +0.19 × 2.27 = +0.43 points
```

#### Example 3: Spam Detection
```
User rapidly posts 60 reactions in 30 minutes:
- Detection: rate > 50/hour
- Penalty: 0.1x weight (90% reduction)
- Warning: "Suspicious activity detected. Please slow down."
- Result: Minimal impact on scores, user throttled
```

### 8. API Endpoints

```typescript
// Add a reaction (like/dislike)
POST /reputation/react/:postId
Body: { type: 'like' | 'dislike' }
Returns: { oldScore, newScore, change, tier, color }

// Increment view count
POST /reputation/view/:postId
Returns: { success: true }

// Get user reputation
GET /reputation/user/:userId
Returns: {
  reliabilityScore,
  tier,
  color,
  stars,
  badge,
  totalViews,
  totalLikes,
  totalDislikes,
  engagementRate,
  postCount
}

// Get current user's reputation
GET /reputation/me

// Recalculate reputation (admin)
POST /reputation/recalculate/:userId
```

### 9. Frontend Integration

```tsx
import ReputationMeter, { ReputationBadge, ReputationCard } from '@/components/ReputationMeter';

// In user avatar/name display
<div className="flex items-center gap-2">
  <img src={user.avatar} className="w-8 h-8 rounded-full" />
  <span>{user.name}</span>
  <ReputationBadge score={user.reliabilityScore} size="small" />
</div>

// In post list
<ReputationMeter 
  score={post.user.reliabilityScore} 
  size="small" 
  showDetails={false} 
/>

// In user profile
<ReputationCard
  score={userData.reliabilityScore}
  tier={userData.tier}
  color={userData.color}
  totalViews={userData.totalViews}
  totalLikes={userData.totalLikes}
  totalDislikes={userData.totalDislikes}
  engagementRate={userData.engagementRate}
  postCount={userData.postCount}
/>
```

### 10. Performance Considerations

1. **Caching**: Cache user reputation scores for 5 minutes
2. **Async Updates**: Recalculate scores in background jobs
3. **Rate Limiting**: Use Redis for distributed rate limiting
4. **Indexes**: Add indexes on reaction timestamps
5. **Batch Processing**: Recalculate multiple users in batches

### 11. Future Enhancements

1. **Weighted Categories**: Different weights for different post types
2. **Community Moderation**: Moderator votes have higher weight
3. **Temporal Bonuses**: Extra weight for consistent activity
4. **Achievement System**: Unlock badges at milestones
5. **Leaderboards**: Top contributors by region/category
6. **AI Detection**: Machine learning for bot detection
7. **Appeal System**: Users can challenge reputation changes

## Summary

This reputation system provides:
- ✅ Fair, normalized scoring (0-100)
- ✅ Time-based decay for relevance
- ✅ Spam/bot protection
- ✅ Visual tier system with colors
- ✅ Scalable for large and small accounts
- ✅ Real-time updates
- ✅ Comprehensive UI components
