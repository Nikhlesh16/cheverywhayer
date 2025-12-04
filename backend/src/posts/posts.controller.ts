import { Controller, Post, Get, Delete, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { PostsService } from './posts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreatePostDto } from './dto/create-post.dto';

@Controller('posts')
export class PostsController {
  constructor(private postsService: PostsService) {}

  /**
   * Create a post in a region
   */
  @Post(':h3Index')
  @UseGuards(JwtAuthGuard)
  async createPost(
    @Param('h3Index') h3Index: string,
    @Body() createPostDto: CreatePostDto,
    @Request() req,
  ) {
    return this.postsService.createPost(req.user.id, h3Index, createPostDto);
  }

  /**
   * Get posts for a region (no auth required - public)
   */
  @Get(':h3Index')
  async getPostsByH3Index(
    @Param('h3Index') h3Index: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0',
  ) {
    return this.postsService.getPostsByH3Index(h3Index, parseInt(limit), parseInt(offset));
  }

  /**
   * Get posts from nearby regions
   */
  @Get('nearby/:h3Index')
  @UseGuards(JwtAuthGuard)
  async getNearbyPosts(
    @Param('h3Index') h3Index: string,
    @Query('ringSize') ringSize: string = '1',
    @Query('limit') limit: string = '100',
  ) {
    return this.postsService.getNearbyPosts(h3Index, parseInt(ringSize), parseInt(limit));
  }

  /**
   * Get single post with replies
   */
  @Get('single/:postId')
  async getPostById(@Param('postId') postId: string) {
    return this.postsService.getPostById(postId);
  }

  /**
   * Get replies to a post
   */
  @Get('replies/:postId')
  async getReplies(@Param('postId') postId: string) {
    return this.postsService.getReplies(postId);
  }

  /**
   * Delete a post (soft delete)
   */
  @Delete(':postId')
  @UseGuards(JwtAuthGuard)
  async deletePost(@Param('postId') postId: string, @Request() req) {
    return this.postsService.deletePost(postId, req.user.id);
  }
}
