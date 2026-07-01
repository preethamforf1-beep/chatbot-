import { Module } from '@nestjs/common';
import { LeavesController } from './leaves.controller';
import { DbModule } from '../db/db.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [DbModule, AuthModule],
  controllers: [LeavesController],
})
export class LeavesModule {}
