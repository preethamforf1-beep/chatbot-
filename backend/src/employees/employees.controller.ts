import { Controller, Get, Param } from '@nestjs/common';
import { HrmsDbService } from '../db/hrms-db.service';

@Controller('employees')
export class EmployeesController {
  constructor(private readonly hrmsDbService: HrmsDbService) {}

  @Get()
  async getAllEmployees() {
    const employees = await this.hrmsDbService.getAllEmployees();
    return { success: true, data: employees };
  }

  @Get(':id')
  async getEmployeeById(@Param('id') id: string) {
    const employee = await this.hrmsDbService.findEmployeeById(id);
    return { success: true, data: employee };
  }
}
