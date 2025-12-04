import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getCurrentUser(@Request() req) {
    return this.usersService.findById(req.user.userId);
  }

  @Get('profile/:id')
  async getUserProfile(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Put('me')
  async updateProfile(
    @Request() req,
    @Body() body: { name?: string; avatar?: string },
  ) {
    return this.usersService.updateProfile(req.user.userId, body);
  }

  @Put('me/avatar')
  async updateAvatar(
    @Request() req,
    @Body() body: { avatarUrl: string },
  ) {
    return this.usersService.updateAvatar(req.user.userId, body.avatarUrl);
  }

  @Get('search')
  async searchUsers(@Query('q') query: string) {
    if (!query || query.length < 2) {
      return [];
    }
    return this.usersService.searchUsers(query);
  }
}
