import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import * as h3 from 'h3-js';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';

// Predefined colors for workspace avatars
const WORKSPACE_COLORS = [
  '#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#2196F3',
  '#03A9F4', '#00BCD4', '#009688', '#4CAF50', '#8BC34A',
  '#FF9800', '#FF5722', '#795548', '#607D8B', '#F44336',
];

@Injectable()
export class WorkspacesService {
  private h3Resolution: number;

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private configService: ConfigService,
  ) {
    this.h3Resolution = parseInt(this.configService.get('H3_RESOLUTION', '8'));
  }

  /**
   * Generate a consistent color based on workspace id
   */
  private generateWorkspaceColor(id: string): string {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = ((hash << 5) - hash) + id.charCodeAt(i);
      hash = hash & hash;
    }
    return WORKSPACE_COLORS[Math.abs(hash) % WORKSPACE_COLORS.length];
  }

  /**
   * Convert lat/lng to H3 index at configured resolution
   */
  latLngToH3(lat: number, lng: number): string {
    try {
      return h3.geoToH3(lat, lng, this.h3Resolution);
    } catch (error) {
      throw new BadRequestException('Invalid latitude or longitude');
    }
  }

  /**
   * Get or create workspace by H3 index
   */
  async getOrCreateWorkspaceByH3Index(h3Index: string, createDto?: CreateWorkspaceDto) {
    // Validate H3 index (basic validation)
    if (!h3Index || h3Index.length < 10) {
      throw new BadRequestException('Invalid H3 index');
    }

    // Check cache first
    const cacheKey = `workspace:${h3Index}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Check database
    let workspace = await this.prisma.workspace.findUnique({
      where: { h3Index },
      include: {
        members: true,
        posts: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    // If not found, create new workspace
    if (!workspace) {
      const tempId = h3Index; // Use h3Index for color generation before we have the real id
      workspace = await this.prisma.workspace.create({
        data: {
          h3Index,
          name: createDto?.name || `Region ${h3Index.slice(0, 8)}`,
          description: createDto?.description,
          color: this.generateWorkspaceColor(tempId),
        },
        include: {
          members: true,
          posts: true,
        },
      });
    }

    // Cache the workspace
    await this.redis.set(cacheKey, JSON.stringify(workspace), 300); // 5 minutes

    return workspace;
  }

  /**
   * Get workspace by H3 index
   */
  async getWorkspaceByH3Index(h3Index: string) {
    if (!h3Index || h3Index.length < 10) {
      throw new BadRequestException('Invalid H3 index');
    }

    const workspace = await this.prisma.workspace.findUnique({
      where: { h3Index },
      include: {
        members: true,
        posts: {
          take: 50,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace not found for H3 index: ${h3Index}`);
    }

    return workspace;
  }

  /**
   * Get nearby workspaces using H3 k-ring
   */
  async getNearbyWorkspaces(h3Index: string, ringSize: number = 1) {
    if (!h3Index || h3Index.length < 10) {
      throw new BadRequestException('Invalid H3 index');
    }

    // Get k-ring of nearby cells - use a simple approximation
    let nearbyIndices = [h3Index];
    try {
      // Try to get parent and children for nearby cells
      const parent = h3.h3ToParent(h3Index, Math.max(0, this.h3Resolution - ringSize));
      const siblings = h3.h3ToChildren(parent, this.h3Resolution);
      nearbyIndices = siblings || [h3Index];
    } catch (e) {
      // Fallback to just the current cell
      nearbyIndices = [h3Index];
    }

    const workspaces = await this.prisma.workspace.findMany({
      where: {
        h3Index: {
          in: nearbyIndices,
        },
      },
      include: {
        members: true,
        _count: {
          select: { posts: true, members: true },
        },
      },
    });

    return workspaces;
  }

  /**
   * Add user to workspace region membership
   */
  async addUserToRegion(userId: string, h3Index: string, lat: number, lng: number) {
    if (!h3Index || h3Index.length < 10) {
      throw new BadRequestException('Invalid H3 index');
    }

    // Ensure workspace exists
    const workspace = await this.getOrCreateWorkspaceByH3Index(h3Index);

    // Create or update region membership
    const membership = await this.prisma.regionMembership.upsert({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId: workspace.id,
        },
      },
      create: {
        userId,
        workspaceId: workspace.id,
        latitude: lat,
        longitude: lng,
      },
      update: {
        latitude: lat,
        longitude: lng,
        updatedAt: new Date(),
      },
    });

    // Invalidate cache
    await this.redis.del(`workspace:${h3Index}`);

    return membership;
  }

  /**
   * Check if user belongs to a region
   */
  async isUserInRegion(userId: string, h3Index: string): Promise<boolean> {
    if (!h3Index || h3Index.length < 10) {
      return false;
    }

    const workspace = await this.prisma.workspace.findUnique({
      where: { h3Index },
    });

    if (!workspace) {
      return false;
    }

    const membership = await this.prisma.regionMembership.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId: workspace.id,
        },
      },
    });

    return !!membership;
  }

  /**
   * Get all regions a user belongs to with unread counts and member counts
   */
  async getUserRegions(userId: string) {
    const memberships = await this.prisma.regionMembership.findMany({
      where: { userId },
      include: {
        workspace: {
          include: {
            _count: {
              select: { members: true, posts: true },
            },
          },
        },
      },
      orderBy: [
        { isPinned: 'desc' },
        { lastVisitedAt: 'desc' },
      ],
    });

    // Calculate unread counts for each workspace
    const workspacesWithUnread = await Promise.all(
      memberships.map(async (membership) => {
        const unreadCount = await this.prisma.post.count({
          where: {
            workspaceId: membership.workspaceId,
            createdAt: {
              gt: membership.lastVisitedAt,
            },
          },
        });

        return {
          id: membership.id,
          isPinned: membership.isPinned,
          lastVisitedAt: membership.lastVisitedAt,
          joinedAt: membership.createdAt,
          customName: membership.customName, // Include user's custom name for this workspace
          workspace: {
            id: membership.workspace.id,
            h3Index: membership.workspace.h3Index,
            name: membership.workspace.name,
            description: membership.workspace.description,
            color: membership.workspace.color || this.generateWorkspaceColor(membership.workspace.id),
            memberCount: membership.workspace._count.members,
            postCount: membership.workspace._count.posts,
          },
          unreadCount,
        };
      })
    );

    return workspacesWithUnread;
  }

  /**
   * Join a workspace
   */
  async joinWorkspace(userId: string, h3Index: string, lat?: number, lng?: number) {
    if (!h3Index || h3Index.length < 10) {
      throw new BadRequestException('Invalid H3 index');
    }

    // Ensure workspace exists
    const workspace = await this.getOrCreateWorkspaceByH3Index(h3Index);

    // Check if already a member
    const existingMembership = await this.prisma.regionMembership.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId: workspace.id,
        },
      },
    });

    if (existingMembership) {
      return { message: 'Already a member', membership: existingMembership };
    }

    // Create membership
    const membership = await this.prisma.regionMembership.create({
      data: {
        userId,
        workspaceId: workspace.id,
        latitude: lat || 0,
        longitude: lng || 0,
        lastVisitedAt: new Date(),
      },
      include: {
        workspace: true,
      },
    });

    // Invalidate cache
    await this.redis.del(`workspace:${h3Index}`);

    return { message: 'Successfully joined workspace', membership };
  }

  /**
   * Leave a workspace
   */
  async leaveWorkspace(userId: string, h3Index: string) {
    if (!h3Index || h3Index.length < 10) {
      throw new BadRequestException('Invalid H3 index');
    }

    const workspace = await this.prisma.workspace.findUnique({
      where: { h3Index },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const membership = await this.prisma.regionMembership.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId: workspace.id,
        },
      },
    });

    if (!membership) {
      throw new NotFoundException('You are not a member of this workspace');
    }

    await this.prisma.regionMembership.delete({
      where: { id: membership.id },
    });

    // Invalidate cache
    await this.redis.del(`workspace:${h3Index}`);

    return { message: 'Successfully left workspace' };
  }

  /**
   * Pin/Unpin a workspace
   */
  async togglePinWorkspace(userId: string, h3Index: string) {
    if (!h3Index || h3Index.length < 10) {
      throw new BadRequestException('Invalid H3 index');
    }

    const workspace = await this.prisma.workspace.findUnique({
      where: { h3Index },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const membership = await this.prisma.regionMembership.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId: workspace.id,
        },
      },
    });

    if (!membership) {
      throw new NotFoundException('You are not a member of this workspace');
    }

    const updated = await this.prisma.regionMembership.update({
      where: { id: membership.id },
      data: { isPinned: !membership.isPinned },
    });

    return { isPinned: updated.isPinned };
  }

  /**
   * Update last visited time for a workspace
   */
  async updateLastVisited(userId: string, h3Index: string) {
    if (!h3Index || h3Index.length < 10) {
      throw new BadRequestException('Invalid H3 index');
    }

    const workspace = await this.prisma.workspace.findUnique({
      where: { h3Index },
    });

    if (!workspace) {
      return null;
    }

    const membership = await this.prisma.regionMembership.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId: workspace.id,
        },
      },
    });

    if (!membership) {
      return null;
    }

    await this.prisma.regionMembership.update({
      where: { id: membership.id },
      data: { lastVisitedAt: new Date() },
    });

    return { updated: true };
  }

  /**
   * Get workspace details with member count
   */
  async getWorkspaceDetails(h3Index: string, userId?: string) {
    if (!h3Index || h3Index.length < 10) {
      throw new BadRequestException('Invalid H3 index');
    }

    const workspace = await this.prisma.workspace.findUnique({
      where: { h3Index },
      include: {
        _count: {
          select: { members: true, posts: true },
        },
      },
    });

    if (!workspace) {
      return null;
    }

    let isMember = false;
    let isPinned = false;
    if (userId) {
      const membership = await this.prisma.regionMembership.findUnique({
        where: {
          userId_workspaceId: {
            userId,
            workspaceId: workspace.id,
          },
        },
      });
      isMember = !!membership;
      isPinned = membership?.isPinned || false;
    }

    return {
      id: workspace.id,
      h3Index: workspace.h3Index,
      name: workspace.name,
      description: workspace.description,
      color: workspace.color || this.generateWorkspaceColor(workspace.id),
      memberCount: workspace._count.members,
      postCount: workspace._count.posts,
      createdAt: workspace.createdAt,
      isMember,
      isPinned,
    };
  }

  /**
   * Get H3 cell boundaries
   */
  getH3CellBoundaries(h3Index: string) {
    if (!h3Index || h3Index.length < 10) {
      throw new BadRequestException('Invalid H3 index');
    }

    const boundary = h3.h3ToGeoBoundary(h3Index);
    return boundary.map(([lat, lng]) => ({ lat, lng }));
  }

  /**
   * Get workspace members
   */
  async getWorkspaceMembers(h3Index: string) {
    if (!h3Index || h3Index.length < 10) {
      throw new BadRequestException('Invalid H3 index');
    }

    const workspace = await this.prisma.workspace.findUnique({
      where: { h3Index },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const members = await this.prisma.regionMembership.findMany({
      where: { workspaceId: workspace.id },
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

    return members.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      avatar: m.user.avatar,
      joinedAt: m.createdAt,
      isPinned: m.isPinned,
    }));
  }

  /**
   * Set custom name for workspace (per user)
   */
  async setCustomWorkspaceName(userId: string, h3Index: string, customName: string | null) {
    if (!h3Index || h3Index.length < 10) {
      throw new BadRequestException('Invalid H3 index');
    }

    const workspace = await this.prisma.workspace.findUnique({
      where: { h3Index },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const membership = await this.prisma.regionMembership.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId: workspace.id,
        },
      },
    });

    if (!membership) {
      throw new NotFoundException('You are not a member of this workspace');
    }

    await this.prisma.regionMembership.update({
      where: { id: membership.id },
      data: { customName },
    });

    return { customName };
  }

  /**
   * Get user's custom name for workspace
   */
  async getCustomWorkspaceName(userId: string, h3Index: string): Promise<string | null> {
    if (!h3Index || h3Index.length < 10) {
      return null;
    }

    const workspace = await this.prisma.workspace.findUnique({
      where: { h3Index },
    });

    if (!workspace) {
      return null;
    }

    const membership = await this.prisma.regionMembership.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId: workspace.id,
        },
      },
    });

    return membership?.customName || null;
  }
}
