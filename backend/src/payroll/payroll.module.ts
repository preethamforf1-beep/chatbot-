import { Module } from '@nestjs/common';
import { PayrollController } from './payroll.controller';
import { DbModule } from '../db/db.module';

@Module({
  imports: [DbModule],
  controllers: [PayrollController],
})
export class PayrollModule {}
