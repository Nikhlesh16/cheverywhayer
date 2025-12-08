import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { GatewayModule } from '../gateway/gateway.module';
import { PostsService } from './posts.service';
import { PostsController } from './posts.controller';

@Module({
  imports: [
    PrismaModule, 
    RedisModule, 
    WorkspacesModule,
    forwardRef(() => GatewayModule), // Use forwardRef to avoid circular dependency
  ],
  providers: [PostsService],
  controllers: [PostsController],
  exports: [PostsService],
})
export class PostsModule {}
