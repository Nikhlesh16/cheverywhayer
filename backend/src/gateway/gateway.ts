import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { PostsService } from '../posts/posts.service';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class EventGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets: Map<string, string[]> = new Map();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private workspacesService: WorkspacesService,
    private postsService: PostsService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token;
      if (!token) {
        client.disconnect();
        return;
      }

      const decoded = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_SECRET'),
      });

      const userId = decoded.sub;
      client.data.userId = userId;

      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, []);
      }
      this.userSockets.get(userId).push(client.id);

      console.log(`✓ User ${userId} connected via ${client.id}`);
    } catch (error) {
      console.error('Connection error:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      const sockets = this.userSockets.get(userId) || [];
      this.userSockets.set(
        userId,
        sockets.filter((id) => id !== client.id),
      );
      console.log(`✓ User ${userId} disconnected`);
    }
  }

  /**
   * Subscribe to a region's updates
   */
  @SubscribeMessage('subscribe-region')
  async subscribeRegion(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { h3Index: string },
  ) {
    const { h3Index } = data;
    const userId = client.data.userId;

    // Add user to region membership
    const recentPosts = await this.workspacesService.getOrCreateWorkspaceByH3Index(h3Index);

    // Join room
    client.join(`region:${h3Index}`);
    console.log(`✓ User ${userId} subscribed to region ${h3Index}`);

    return {
      status: 'subscribed',
      h3Index,
      posts: recentPosts.posts,
    };
  }

  /**
   * Unsubscribe from a region
   */
  @SubscribeMessage('unsubscribe-region')
  unsubscribeRegion(@ConnectedSocket() client: Socket, @MessageBody() data: { h3Index: string }) {
    const { h3Index } = data;
    client.leave(`region:${h3Index}`);
    console.log(`✓ Client ${client.id} unsubscribed from region ${h3Index}`);
    return { status: 'unsubscribed', h3Index };
  }

  /**
   * Post a message to a region
   */
  @SubscribeMessage('post-message')
  async postMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { h3Index: string; content: string },
  ) {
    const { h3Index, content } = data;
    const userId = client.data.userId;

    try {
      const post = await this.postsService.createPost(userId, h3Index, { content });

      // Broadcast to all clients in the region room
      this.server.to(`region:${h3Index}`).emit('new-post', post);

      return { success: true, post };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Broadcast an update to a region
   */
  broadcastToRegion(h3Index: string, event: string, data: any) {
    this.server.to(`region:${h3Index}`).emit(event, data);
  }

  /**
   * Get user's active regions
   */
  @SubscribeMessage('get-active-regions')
  async getActiveRegions(@ConnectedSocket() client: Socket) {
    const userId = client.data.userId;

    try {
      const regions = await this.workspacesService.getUserRegions(userId);
      return {
        success: true,
        regions: regions.map((r) => ({
          h3Index: r.workspace.h3Index,
          workspaceName: r.workspace.name,
          memberCount: r.workspace.memberCount,
          unreadCount: r.unreadCount,
          isPinned: r.isPinned,
        })),
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}
