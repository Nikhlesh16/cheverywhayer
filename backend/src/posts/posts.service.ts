import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { CreatePostDto } from './dto/create-post.dto';

@Injectable()
export class PostsService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private workspacesService: WorkspacesService,
  ) {}

  /**
   * Create a post in a region (no membership required - anyone can post)
   */
  async createPost(userId: string, h3Index: string, createPostDto: CreatePostDto) {
    // Get workspace by H3 index
    const workspace = await this.prisma.workspace.findUnique({
      where: { h3Index },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    // Require either content or image
    if (!createPostDto.content?.trim() && !createPostDto.imageUrl) {
      throw new ForbiddenException('Post must have content or an image');
    }

    // Create post with optional image, location, and reply
    const post = await this.prisma.post.create({
      data: {
        content: createPostDto.content || '',
        imageUrl: createPostDto.imageUrl,
        latitude: createPostDto.latitude,
        longitude: createPostDto.longitude,
        locationName: createPostDto.locationName,
        replyToId: createPostDto.replyToId,
        userId,
        workspaceId: workspace.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        replyTo: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Invalidate workspace cache
    await this.redis.del(`workspace:${h3Index}`);

    // Publish to Redis channel for real-time updates
    await this.redis.publish(`workspace:${h3Index}:posts`, JSON.stringify(post));

    return post;
  }

  /**
   * Get posts for a region (chronological order - oldest first for chat-like display)
   */
  async getPostsByH3Index(h3Index: string, limit: number = 50, offset: number = 0) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { h3Index },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const posts = await this.prisma.post.findMany({
      where: { 
        workspaceId: workspace.id,
        isDeleted: false,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        replyTo: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: { replies: true },
        },
      },
      orderBy: { createdAt: 'asc' }, // Oldest first for chat-like display
      take: limit,
      skip: offset,
    });

    const total = await this.prisma.post.count({
      where: { 
        workspaceId: workspace.id,
        isDeleted: false,
      },
    });

    return {
      posts,
      total,
      limit,
      offset,
    };
  }

  /**
   * Get posts from nearby regions using H3 k-ring
   */
  async getNearbyPosts(h3Index: string, ringSize: number = 1, limit: number = 100) {
    const nearbyWorkspaces = await this.workspacesService.getNearbyWorkspaces(h3Index, ringSize);
    const workspaceIds = nearbyWorkspaces.map((w) => w.id);

    const posts = await this.prisma.post.findMany({
      where: {
        workspaceId: {
          in: workspaceIds,
        },
        isDeleted: false,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        workspace: {
          select: {
            id: true,
            h3Index: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return posts;
  }

  /**
   * Get replies to a post
   */
  async getReplies(postId: string) {
    const replies = await this.prisma.post.findMany({
      where: {
        replyToId: postId,
        isDeleted: false,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return replies;
  }

  /**
   * Soft delete a post
   */
  async deletePost(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        workspace: true,
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.userId !== userId) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    // Soft delete
    await this.prisma.post.update({
      where: { id: postId },
      data: { isDeleted: true },
    });

    // Invalidate workspace cache
    await this.redis.del(`workspace:${post.workspace.h3Index}`);

    return { success: true };
  }

  /**
   * Get single post by ID
   */
  async getPostById(postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        replyTo: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        replies: {
          where: { isDeleted: false },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!post || post.isDeleted) {
      throw new NotFoundException('Post not found');
    }

    return post;
  }
}
