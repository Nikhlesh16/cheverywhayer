import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ReputationService } from './reputation.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('reputation')
@UseGuards(JwtAuthGuard)
export class ReputationController {
  constructor(private readonly reputationService: ReputationService) {}

  /**
   * Add or toggle a reaction (like/dislike)
   */
  @Post('react/:postId')
  async reactToPost(
    @Param('postId') postId: string,
    @Body() body: { type: 'like' | 'dislike' },
    @Request() req,
  ) {
    return this.reputationService.addReaction(req.user.id, postId, body.type);
  }

  /**
   * Increment view count when user views a post
   */
  @Post('view/:postId')
  async viewPost(@Param('postId') postId: string) {
    await this.reputationService.incrementViewCount(postId);
    return { success: true };
  }

  /**
   * Get user's reputation summary
   */
  @Get('user/:userId')
  async getUserReputation(@Param('userId') userId: string) {
    return this.reputationService.getUserReputation(userId);
  }

  /**
   * Get current user's reputation
   */
  @Get('me')
  async getMyReputation(@Request() req) {
    return this.reputationService.getUserReputation(req.user.id);
  }

  /**
   * Manually recalculate reputation (admin/maintenance)
   */
  @Post('recalculate/:userId')
  async recalculateReputation(@Param('userId') userId: string) {
    return this.reputationService.recalculateUserReliability(userId);
  }
}
