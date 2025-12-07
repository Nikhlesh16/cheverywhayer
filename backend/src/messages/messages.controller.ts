import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  @Get('conversations')
  async getConversations(@Request() req) {
    return this.messagesService.getConversations(req.user.userId);
  }

  @Post('conversations/:userId')
  async createConversation(@Request() req, @Param('userId') otherUserId: string) {
    return this.messagesService.getOrCreateConversation(req.user.userId, otherUserId);
  }

  @Get('conversations/:conversationId/messages')
  async getMessages(@Request() req, @Param('conversationId') conversationId: string) {
    return this.messagesService.getMessages(conversationId, req.user.userId);
  }

  @Post('conversations/:conversationId/messages')
  async sendMessage(
    @Request() req,
    @Param('conversationId') conversationId: string,
    @Body() body: { receiverId: string; content: string },
  ) {
    return this.messagesService.sendMessage(
      conversationId,
      req.user.userId,
      body.receiverId,
      body.content,
    );
  }
}
