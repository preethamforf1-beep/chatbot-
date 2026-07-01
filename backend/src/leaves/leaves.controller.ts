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

  // Read identity straight from the JWT. The token already carries employeeId,
  // role and name (see AuthService.generateAccessToken), so there is no need to
  // call findUserById -> usp_GetUserById (a dead trial proc that caused the 500).
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

    // USP_GetLeaveHistory is per-employee. There is no "all requests / pending
    // queue" proc yet, so for the demo every role sees their own list.
    const history = await this.hrmsDbService.getLeaveHistory(user.employeeId);

    // Map HRMSDEV history -> the exact fields LeaveRequests.tsx reads.
    // status is lowercased so the component's `=== 'pending'` checks and its
    // status-<x> CSS class both work.
    const data = history.map((h) => ({
      requestCode: String(h.leaveId),
      leaveId:     h.leaveId,
      employeeId:  user.employeeId,       // list is this user's own; fills the blank label
      leaveType:   h.leaveType,
      startDate:   h.fromDate,
      endDate:     h.toDate,
      leaveDate:   h.fromDate,            // single-day branch fallback
      duration:    h.noOfDays,
      dayType:     'Full Day',            // history proc has no day-type; sane default
      reason:      h.reason,
      status:      (h.status || '').toLowerCase(),
      statusId:    h.statusId,
      createdAt:   h.appliedDate || null, // fixes "Invalid Date"
    }));

    return { success: true, data };
  }

  @Post()
  async createLeave(
    @Headers('authorization') authorization: string,
    @Body() body: any,
  ) {
    const user = this.getUserFromToken(authorization);
    if (!user) throw new UnauthorizedException('Missing or invalid auth token');

    // Tolerate whatever field names the form sends.
    const fromDate = body.fromDate ?? body.startDate ?? body.leaveDate;
    const toDate   = body.toDate   ?? body.endDate   ?? fromDate;
    const reason   = body.reason ?? null;

    // Accept a numeric leaveTypeId OR a code like "CL" and resolve it.
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

    // createLeaveRequest returns { ok, statusCode, message } from the proc's
    // own 200/400/404/409 response (insufficient balance, overlap, etc.).
    const result = await this.hrmsDbService.createLeaveRequest(user.employeeId, {
      leaveTypeId, fromDate, toDate, reason,
    });

    // Return a `data` object too so the component's response.data.data access
    // doesn't crash, and surface the proc's message.
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
    // Phase 2 - not wired yet (needs USP_HierarchicalLeaveAction + an ApprovalId).
    // Friendly response instead of hitting a dead proc.
    return {
      success: false,
      message: 'Approvals are not enabled in this demo yet.',
      data: { requestCode: code },
    };
  }

  @Patch(':code/cancel')
  async cancelLeave(
    @Headers('authorization') authorization: string,
    @Param('code') code: string,
  ) {
    const user = this.getUserFromToken(authorization);
    if (!user) throw new UnauthorizedException('Missing or invalid auth token');
    // No withdrawal proc exists in HRMSDEV yet. Friendly response, not a 500.
    return {
      success: false,
      message: 'Leave cancellation is not available yet - please use the portal.',
      data: { requestCode: code },
    };
  }
}