import { Controller, Get } from '@nestjs/common';
import { HrmsDbService } from '../db/hrms-db.service';

@Controller('payroll')
export class PayrollController {
  constructor(private readonly hrmsDbService: HrmsDbService) {}

  @Get('report/summary')
  async getSummary() {
    const summary = await this.hrmsDbService.getPayrollSummary();
    return { success: true, data: summary };
  }
}
