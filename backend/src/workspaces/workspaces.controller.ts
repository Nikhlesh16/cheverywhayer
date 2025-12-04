import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request, BadRequestException, Query } from '@nestjs/common';
import { WorkspacesService } from './workspaces.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';

@Controller('workspaces')
export class WorkspacesController {
  constructor(private workspacesService: WorkspacesService) {}

  /**
   * Convert lat/lng to H3 index
   */
  @Get('latlng-to-h3')
  latLngToH3(@Query('lat') lat: string, @Query('lng') lng: string) {
    if (!lat || !lng) {
      throw new BadRequestException('Latitude and longitude are required');
    }
    return {
      h3Index: this.workspacesService.latLngToH3(parseFloat(lat), parseFloat(lng)),
    };
  }

  /**
   * Create workspace by H3 index (anyone can create)
   */
  @Post('h3/:h3Index')
  async createWorkspaceByH3Index(
    @Param('h3Index') h3Index: string,
    @Body() createDto: CreateWorkspaceDto,
  ) {
    return this.workspacesService.getOrCreateWorkspaceByH3Index(h3Index, createDto);
  }

  /**
   * Get workspace by H3 index (no auth required - public communities)
   */
  @Get('h3/:h3Index')
  async getWorkspaceByH3Index(@Param('h3Index') h3Index: string) {
    return this.workspacesService.getWorkspaceByH3Index(h3Index);
  }

  /**
   * Get workspace details with member info
   */
  @Get('details/:h3Index')
  @UseGuards(JwtAuthGuard)
  async getWorkspaceDetails(@Param('h3Index') h3Index: string, @Request() req) {
    return this.workspacesService.getWorkspaceDetails(h3Index, req.user.id);
  }

  /**
   * Get nearby workspaces
   */
  @Get('nearby/:h3Index')
  @UseGuards(JwtAuthGuard)
  async getNearbyWorkspaces(
    @Param('h3Index') h3Index: string,
    @Body() body: { ringSize?: number },
  ) {
    return this.workspacesService.getNearbyWorkspaces(h3Index, body.ringSize || 1);
  }

  /**
   * Get H3 cell boundaries
   */
  @Get('boundaries/:h3Index')
  getH3CellBoundaries(@Param('h3Index') h3Index: string) {
    return {
      h3Index,
      boundaries: this.workspacesService.getH3CellBoundaries(h3Index),
    };
  }

  /**
   * Join a workspace
   */
  @Post('join/:h3Index')
  @UseGuards(JwtAuthGuard)
  async joinWorkspace(
    @Param('h3Index') h3Index: string,
    @Body() body: { lat?: number; lng?: number },
    @Request() req,
  ) {
    return this.workspacesService.joinWorkspace(req.user.id, h3Index, body.lat, body.lng);
  }

  /**
   * Leave a workspace
   */
  @Delete('leave/:h3Index')
  @UseGuards(JwtAuthGuard)
  async leaveWorkspace(@Param('h3Index') h3Index: string, @Request() req) {
    return this.workspacesService.leaveWorkspace(req.user.id, h3Index);
  }

  /**
   * Pin/Unpin a workspace
   */
  @Post('pin/:h3Index')
  @UseGuards(JwtAuthGuard)
  async togglePinWorkspace(@Param('h3Index') h3Index: string, @Request() req) {
    return this.workspacesService.togglePinWorkspace(req.user.id, h3Index);
  }

  /**
   * Mark workspace as visited (resets unread count)
   */
  @Post('visit/:h3Index')
  @UseGuards(JwtAuthGuard)
  async visitWorkspace(@Param('h3Index') h3Index: string, @Request() req) {
    return this.workspacesService.updateLastVisited(req.user.id, h3Index);
  }

  /**
   * Check if user belongs to region
   */
  @Get('check-membership/:h3Index')
  @UseGuards(JwtAuthGuard)
  async isUserInRegion(@Param('h3Index') h3Index: string, @Request() req) {
    const isMember = await this.workspacesService.isUserInRegion(req.user.id, h3Index);
    return { isMember, h3Index };
  }

  /**
   * Get user's workspaces with unread counts
   */
  @Get('my-workspaces')
  @UseGuards(JwtAuthGuard)
  async getUserWorkspaces(@Request() req) {
    return this.workspacesService.getUserRegions(req.user.id);
  }

  /**
   * Legacy endpoint - Get user's regions
   */
  @Get('my-regions')
  @UseGuards(JwtAuthGuard)
  async getUserRegions(@Request() req) {
    return this.workspacesService.getUserRegions(req.user.id);
  }

  /**
   * Get workspace members
   */
  @Get('members/:h3Index')
  @UseGuards(JwtAuthGuard)
  async getWorkspaceMembers(@Param('h3Index') h3Index: string) {
    return this.workspacesService.getWorkspaceMembers(h3Index);
  }

  /**
   * Get custom name for workspace
   */
  @Get('custom-name/:h3Index')
  @UseGuards(JwtAuthGuard)
  async getCustomWorkspaceName(@Param('h3Index') h3Index: string, @Request() req) {
    const customName = await this.workspacesService.getCustomWorkspaceName(req.user.id, h3Index);
    return { customName };
  }

  /**
   * Set custom name for workspace
   */
  @Post('custom-name/:h3Index')
  @UseGuards(JwtAuthGuard)
  async setCustomWorkspaceName(
    @Param('h3Index') h3Index: string,
    @Body() body: { customName: string | null },
    @Request() req,
  ) {
    return this.workspacesService.setCustomWorkspaceName(req.user.id, h3Index, body.customName);
  }
}
