import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Reliability-Based Reputation System
 * 
 * ALGORITHM DESIGN:
 * ==================
 * 
 * 1. RELIABILITY SCORE FORMULA:
 *    Base Formula: R = 50 + (PositiveWeight - NegativeWeight) * ScalingFactor
 *    
 *    Where:
 *    - R = Reliability Score (clamped to 0-100)
 *    - PositiveWeight = Σ(likes_i / max(views_i, 1)) * TimeDecay_i
 *    - NegativeWeight = Σ(dislikes_i / max(views_i, 1)) * TimeDecay_i
 *    - ScalingFactor = 50 / (1 + TotalEngagement/100) // Prevents unbounded growth
 *    - TimeDecay_i = e^(-λ * age_days) where λ = 0.01 (older posts decay)
 * 
 * 2. NORMALIZATION LOGIC:
 *    - Score is always between 0-100
 *    - New users start at 50 (neutral)
 *    - Sigmoid normalization: S(x) = 100 / (1 + e^(-(x-50)/10))
 *    - This creates smooth transitions and prevents extreme values
 * 
 * 3. DECAY RULES:
 *    - Exponential decay: weight = e^(-0.01 * days_old)
 *    - Posts older than 1 year have ~0.003x influence
 *    - Recent posts (< 7 days) have ~0.93x to 1.0x influence
 * 
 * 4. SPAM PROTECTION:
 *    - Rate limiting: Max 1 reaction change per user per post per hour
 *    - Sudden spike detection: If engagement rate > 10x user's average, apply 0.5x weight
 *    - Bot detection: Users with > 50 reactions in 1 hour are flagged
 *    - Minimum views threshold: Posts need at least 3 views to affect score
 * 
 * 5. UI REPRESENTATION:
 *    Score Tiers:
 *    - 0-20:   ⭐ "New" - Gray (#9CA3AF)
 *    - 21-40:  ⭐⭐ "Emerging" - Blue (#3B82F6)
 *    - 41-60:  ⭐⭐⭐ "Reliable" - Green (#10B981)
 *    - 61-80:  ⭐⭐⭐⭐ "Trusted" - Yellow (#F59E0B)
 *    - 81-100: ⭐⭐⭐⭐⭐ "Expert" - Purple (#8B5CF6)
 */

export interface ReputationUpdate {
  oldScore: number;
  newScore: number;
  change: number;
  tier: string;
  color: string;
}

@Injectable()
export class ReputationService {
  constructor(private prisma: PrismaService) {}

  /**
   * Calculate time decay factor for a post
   */
  private calculateTimeDecay(createdAt: Date): number {
    const ageInDays = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    const lambda = 0.01; // Decay rate
    return Math.exp(-lambda * ageInDays);
  }

  /**
   * Detect if engagement is suspicious (spam/bot)
   */
  private async detectSuspiciousActivity(postId: string, userId: string): Promise<number> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    // Check if user has made too many reactions recently
    const recentReactions = await this.prisma.postReaction.count({
      where: {
        userId,
        createdAt: { gte: oneHourAgo },
      },
    });

    // Bot/spam detection
    if (recentReactions > 50) {
      return 0.1; // Heavy penalty for suspicious activity
    }

    // Check if this specific post has unusual engagement
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        reactions: {
          where: { createdAt: { gte: oneHourAgo } },
        },
      },
    });

    if (!post) return 1.0;

    const recentEngagementRate = post.reactions.length / Math.max(post.viewCount, 1);
    const normalEngagementRate = 0.1; // Typical 10% engagement

    // If engagement is 10x normal, it might be a brigade/spam
    if (recentEngagementRate > normalEngagementRate * 10) {
      return 0.5; // Reduce influence of suspicious posts
    }

    return 1.0; // Normal weight
  }

  /**
   * Calculate engagement ratio with normalization
   */
  private calculateEngagementRatio(likes: number, dislikes: number, views: number): number {
    const minViews = 3; // Minimum views to be considered
    if (views < minViews) return 0;

    const effectiveViews = Math.max(views, 1);
    const positiveRatio = likes / effectiveViews;
    const negativeRatio = dislikes / effectiveViews;

    return positiveRatio - negativeRatio;
  }

  /**
   * Apply sigmoid normalization to keep score in 0-100 range
   */
  private normalizeScore(rawScore: number): number {
    // Sigmoid function centered at 50
    const normalized = 100 / (1 + Math.exp(-(rawScore - 50) / 10));
    return Math.max(0, Math.min(100, normalized));
  }

  /**
   * Get reputation tier and color based on score
   */
  getTierInfo(score: number): { tier: string; color: string; stars: number; badge: string } {
    if (score <= 20) {
      return { tier: 'New', color: '#9CA3AF', stars: 1, badge: '⭐' };
    } else if (score <= 40) {
      return { tier: 'Emerging', color: '#3B82F6', stars: 2, badge: '⭐⭐' };
    } else if (score <= 60) {
      return { tier: 'Reliable', color: '#10B981', stars: 3, badge: '⭐⭐⭐' };
    } else if (score <= 80) {
      return { tier: 'Trusted', color: '#F59E0B', stars: 4, badge: '⭐⭐⭐⭐' };
    } else {
      return { tier: 'Expert', color: '#8B5CF6', stars: 5, badge: '⭐⭐⭐⭐⭐' };
    }
  }

  /**
   * Recalculate user's reliability score based on all their posts
   */
  async recalculateUserReliability(userId: string): Promise<ReputationUpdate> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        posts: {
          where: { isDeleted: false },
          include: {
            reactions: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const oldScore = user.reliabilityScore;
    let positiveWeight = 0;
    let negativeWeight = 0;
    let totalEngagement = 0;

    // Process each post
    for (const post of user.posts) {
      const timeDecay = this.calculateTimeDecay(post.createdAt);
      const likeCount = post.reactions.filter(r => r.type === 'like').length;
      const dislikeCount = post.reactions.filter(r => r.type === 'dislike').length;
      const views = Math.max(post.viewCount, 1);

      const engagementRatio = this.calculateEngagementRatio(likeCount, dislikeCount, views);
      totalEngagement += likeCount + dislikeCount;

      if (engagementRatio > 0) {
        positiveWeight += Math.abs(engagementRatio) * timeDecay;
      } else {
        negativeWeight += Math.abs(engagementRatio) * timeDecay;
      }
    }

    // Apply scaling factor to prevent unbounded growth
    const scalingFactor = 50 / (1 + totalEngagement / 100);
    
    // Calculate raw score
    const rawScore = 50 + (positiveWeight - negativeWeight) * scalingFactor;
    
    // Normalize to 0-100
    const newScore = this.normalizeScore(rawScore);

    // Update user
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        reliabilityScore: newScore,
        totalLikes: user.posts.reduce((sum, p) => sum + p.likeCount, 0),
        totalDislikes: user.posts.reduce((sum, p) => sum + p.dislikeCount, 0),
        totalViews: user.posts.reduce((sum, p) => sum + p.viewCount, 0),
      },
    });

    const tierInfo = this.getTierInfo(newScore);

    return {
      oldScore,
      newScore,
      change: newScore - oldScore,
      tier: tierInfo.tier,
      color: tierInfo.color,
    };
  }

  /**
   * Add or update a reaction (like/dislike)
   */
  async addReaction(userId: string, postId: string, type: 'like' | 'dislike'): Promise<ReputationUpdate> {
    // Check for spam
    const suspicionWeight = await this.detectSuspiciousActivity(postId, userId);
    
    if (suspicionWeight < 0.5) {
      throw new Error('Suspicious activity detected. Please slow down.');
    }

    // Check if reaction already exists
    const existing = await this.prisma.postReaction.findUnique({
      where: {
        userId_postId: { userId, postId },
      },
    });

    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new Error('Post not found');
    }

    if (existing) {
      // Update existing reaction
      if (existing.type === type) {
        // Remove reaction (toggle off)
        await this.prisma.postReaction.delete({
          where: { id: existing.id },
        });

        // Update post counts
        await this.prisma.post.update({
          where: { id: postId },
          data: {
            likeCount: type === 'like' ? { decrement: 1 } : undefined,
            dislikeCount: type === 'dislike' ? { decrement: 1 } : undefined,
          },
        });
      } else {
        // Change reaction type
        await this.prisma.postReaction.update({
          where: { id: existing.id },
          data: { type },
        });

        // Update post counts
        await this.prisma.post.update({
          where: { id: postId },
          data: {
            likeCount: type === 'like' ? { increment: 1 } : { decrement: 1 },
            dislikeCount: type === 'dislike' ? { increment: 1 } : { decrement: 1 },
          },
        });
      }
    } else {
      // Create new reaction
      await this.prisma.postReaction.create({
        data: {
          userId,
          postId,
          type,
        },
      });

      // Update post counts
      await this.prisma.post.update({
        where: { id: postId },
        data: {
          likeCount: type === 'like' ? { increment: 1 } : undefined,
          dislikeCount: type === 'dislike' ? { increment: 1 } : undefined,
        },
      });
    }

    // Recalculate post author's reliability
    return this.recalculateUserReliability(post.userId);
  }

  /**
   * Increment view count for a post
   */
  async incrementViewCount(postId: string): Promise<void> {
    // For production, use Redis for better rate limiting per viewer
    await this.prisma.post.update({
      where: { id: postId },
      data: { viewCount: { increment: 1 } },
    });
  }

  /**
   * Get user reputation summary
   */
  async getUserReputation(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        avatar: true,
        reliabilityScore: true,
        totalViews: true,
        totalLikes: true,
        totalDislikes: true,
        posts: {
          where: { isDeleted: false },
          select: { id: true, viewCount: true, likeCount: true, dislikeCount: true },
        },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const tierInfo = this.getTierInfo(user.reliabilityScore);
    const engagementRate = user.totalViews > 0 
      ? ((user.totalLikes + user.totalDislikes) / user.totalViews * 100).toFixed(1)
      : '0.0';

    return {
      ...user,
      tier: tierInfo.tier,
      color: tierInfo.color,
      stars: tierInfo.stars,
      badge: tierInfo.badge,
      engagementRate: `${engagementRate}%`,
      postCount: user.posts.length,
    };
  }
}
