import { Controller, Get, Param } from '@nestjs/common';
import { HrmsDbService } from './hrms-db.service';

@Controller('db')
export class DbTestController {
  constructor(private readonly hrmsDbService: HrmsDbService) {}

  @Get('ping')
  async ping() {
    const result = await this.hrmsDbService.ping();
    return { success: true, message: 'DB ping successful', result };
  }

  @Get('verify/:userId')
  async verifyUser(@Param('userId') userId: string) {
    const user = await this.hrmsDbService.findUserById(userId);
    if (!user) {
      return { success: false, message: `User ${userId} not found` };
    }

    const employee = await this.hrmsDbService.findEmployeeById(user.employeeId);
    return {
      success: true,
      message: `Verified ${userId}`,
      user,
      employee,
    };
  }
}
