import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { PostsModule } from '../posts/posts.module';
import { RedisModule } from '../redis/redis.module';
import { EventGateway } from './gateway';

@Module({
  imports: [
    AuthModule, 
    WorkspacesModule, 
    forwardRef(() => PostsModule), 
    RedisModule
  ],
  providers: [EventGateway],
  exports: [EventGateway], // Export so PostsModule can inject it
})
export class GatewayModule {}
