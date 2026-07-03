import {
  BadRequestException, Body, Controller, Get, Headers,
  Param, Patch, Post, UnauthorizedException,
} from '@nestjs/common';
import { HrmsDbService } from '../db/hrms-db.service';
import { AuthService } from '../auth/auth.service';

@Controller('leaves')
export class LeavesController {
  constructor(
    private readonly hrmsDbService: HrmsDbService,
    private readonly authService: AuthService,
  ) {}

  private getUserFromToken(authorization?: string):
    { employeeId: string; role: string; name: string } | null {
    const token = authorization?.split(' ')[1];
    if (!token) return null;
    try {
      const payload = this.authService.verifyAccessToken(token);
      if (!payload?.employeeId) return null;
      return {
        employeeId: String(payload.employeeId),
        role: String(payload.role ?? 'employee'),
        name: String(payload.name ?? ''),
      };
    } catch {
      return null;
    }
  }

  @Get()
  async getLeaves(@Headers('authorization') authorization?: string) {
    const user = this.getUserFromToken(authorization);
    if (!user) throw new UnauthorizedException('Missing or invalid auth token');

    const history = await this.hrmsDbService.getLeaveHistory(user.employeeId);

    const data = history.map((h) => ({
      requestCode: String(h.leaveId),
      leaveId:     h.leaveId,
      employeeId:  user.employeeId,
      leaveType:   h.leaveType,
      startDate:   h.fromDate,
      endDate:     h.toDate,
      leaveDate:   h.fromDate,
      duration:    h.noOfDays,
      dayType:     'Full Day',
      reason:      h.reason,
      status:      (h.status || '').toLowerCase(),
      statusId:    h.statusId,
      createdAt:   h.appliedDate || null,
    }));

    return { success: true, data };
  }

  // Latest leave (single most recent, any status incl. pending) via USP_GetLeaveStatus.
  // Complements GET / (which shows acted-on leaves only, excluding pending).
  @Get('all')
  async getAllLeaves(@Headers('authorization') authorization?: string) {
    const user = this.getUserFromToken(authorization);
    if (!user) throw new UnauthorizedException('Missing or invalid auth token');

    const leaves = await this.hrmsDbService.getLeaveStatus(user.employeeId);
    return { success: true, data: leaves };
  }

  @Post()
  async createLeave(
    @Headers('authorization') authorization: string,
    @Body() body: any,
  ) {
    const user = this.getUserFromToken(authorization);
    if (!user) throw new UnauthorizedException('Missing or invalid auth token');

    const fromDate = body.fromDate ?? body.startDate ?? body.leaveDate;
    const toDate   = body.toDate   ?? body.endDate   ?? fromDate;
    const reason   = body.reason ?? null;

    let leaveTypeId: number | null =
      body.leaveTypeId != null ? Number(body.leaveTypeId) : null;

    if (!leaveTypeId && (body.leaveType || body.leaveTypeCode)) {
      const code = String(body.leaveType ?? body.leaveTypeCode).toUpperCase();
      const types = await this.hrmsDbService.getLeaveTypes();
      const match = types.find((t) => (t.code ?? '').toUpperCase() === code);
      leaveTypeId = match ? match.id : null;
    }

    if (!leaveTypeId || !fromDate || !toDate) {
      throw new BadRequestException(
        'leaveTypeId (or leaveType code), fromDate and toDate are required',
      );
    }

    const result = await this.hrmsDbService.createLeaveRequest(user.employeeId, {
      leaveTypeId, fromDate, toDate, reason,
    });

    return {
      success: result.ok,
      statusCode: result.statusCode,
      message: result.message,
      data: { requestCode: '', message: result.message },
    };
  }

  @Patch(':code/approve')
  async approveLeave(
    @Headers('authorization') authorization: string,
    @Param('code') code: string,
  ) {
    const user = this.getUserFromToken(authorization);
    if (!user) throw new UnauthorizedException('Missing or invalid auth token');
    if (user.role !== 'hr' && user.role !== 'admin') {
      throw new UnauthorizedException('Not authorized to approve leave requests');
    }
    return {
      success: false,
      message: 'Approvals are not enabled in this demo yet.',
      data: { requestCode: code, message: 'Approvals are not enabled in this demo yet.' },
    };
  }

  @Patch(':code/cancel')
  async cancelLeave(
    @Headers('authorization') authorization: string,
    @Param('code') code: string,
  ) {
    const user = this.getUserFromToken(authorization);
    if (!user) throw new UnauthorizedException('Missing or invalid auth token');
    return {
      success: false,
      message: 'Leave cancellation is not available yet - please use the portal.',
      data: { requestCode: code, message: 'Leave cancellation is not available yet - please use the portal.' },
    };
  }
}