import { Module } from '@nestjs/common';
import { DbTestController } from './db-test.controller';
import { HrmsDbService } from './hrms-db.service';

@Module({
  imports: [],
  controllers: [DbTestController],
  providers: [HrmsDbService],
  exports: [HrmsDbService],
})
export class DbModule {}
