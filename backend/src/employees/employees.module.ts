import { Module } from '@nestjs/common';
import { EmployeesController } from './employees.controller';
import { DbModule } from '../db/db.module';

@Module({
  imports: [DbModule],
  controllers: [EmployeesController],
})
export class EmployeesModule {}
