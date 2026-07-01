import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sql from 'mssql';

@Injectable()
export class HrmsDbService {
  private pool?: sql.ConnectionPool;

  constructor(private readonly config: ConfigService) {}

  private async getPool() {
    if (this.pool?.connected) return this.pool;

    this.pool = await new sql.ConnectionPool({
      user:     this.config.get<string>('DB_USER')     || '',
      password: this.config.get<string>('DB_PASSWORD') || '',
      server:   this.config.get<string>('DB_HOST')     || 'localhost',
      database: this.config.get<string>('DB_NAME')     || '',
      options:  { encrypt: false, trustServerCertificate: true },
    }).connect();

    return this.pool;
  }

  // ─── HRMSDEV: real basic-info via USP_GetUserInfo ────────────────────────────
  // Maps THEIR procedure's columns to the shape the chatbot already expects
  // (selfEmployee: { id, name, department, designation, ... } + holidays).
  async getUserInfo(employeeId: string) {
    const pool = await this.getPool();

    // USP_GetUserInfo RAISERRORs if the employee isn't found / inactive. Catch it so a
    // single bad lookup degrades gracefully (returns null) instead of crashing the
    // whole chatbot response.
    let result: sql.IProcedureResult<any>;
    try {
      result = await pool.request()
        .input('EmployeeID', sql.VarChar, employeeId)
        .execute('USP_GetUserInfo');
    } catch (err) {
      console.error('getUserInfo failed for', employeeId, '-', (err as Error).message);
      return null;
    }

    // USP_GetUserInfo returns 3 result sets:
    //   [0] profile, [1] menus (ignored for now), [2] holidays
    const profileRow  = result.recordsets[0]?.[0];
    const holidayRows  = (result.recordsets[2] as any[]) ?? [];

    if (!profileRow) return null;

    const self = {
      id:          profileRow.EmployeeID,
      name:        profileRow.FullName,
      department:  profileRow.Department   ?? 'N/A',
      designation: profileRow.Designation  ?? 'N/A',
      company:     profileRow.CompanyName  ?? '',
      companyId:   profileRow.CompanyID    ?? null,
      email:       profileRow.Email        ?? '',
      role:        profileRow.DefaultRole  ?? '',
    };

    const holidays = holidayRows.map((h: any) => ({
      date: h.HolidayDate ? new Date(h.HolidayDate).toISOString().slice(0, 10) : '',
      name: h.HolidayName,
    }));

    return { self, holidays };
  }

  // ─── HRMSDEV: fetch user by email for login (USP_Validateuser) ────────────────
  // Returns the raw row including PasswordHash; AuthService does the bcrypt.compare.
  async validateUser(email: string) {
    const pool = await this.getPool();
    const result = await pool.request()
      .input('EmailID', sql.VarChar, email)
      .execute('USP_Validateuser');

    return result.recordset[0] ?? null;
  }

  // ─── HRMSDEV: real leave-type catalogue from Mst_LeaveType ────────────────────
  // The master list of all leave types (CL, SL, EL, ...) with their annual quota.
  // Used by the chatbot's "leave policy" intent instead of hardcoded text.
  async getLeaveTypes() {
    const pool = await this.getPool();
    try {
      const result = await pool.request().query(
        `SELECT ID, Name, Code, Description, AnnualQuota
         FROM Mst_LeaveType
         WHERE IsActive = 1
         ORDER BY ID`,
      );
      return result.recordset.map((r: any) => ({
        id:          Number(r.ID),
        name:        r.Name,
        code:        r.Code,
        description: r.Description,
        annualQuota: r.AnnualQuota === null ? null : Number(r.AnnualQuota),
      }));
    } catch (err) {
      console.error('getLeaveTypes failed -', (err as Error).message);
      return [];
    }
  }

  // ─── HRMSDEV: real department list from Mst_Department ────────────────────────
  async getDepartments() {
    const pool = await this.getPool();
    try {
      const result = await pool.request().query(
        `SELECT Name FROM Mst_Department WHERE IsActive = 1 ORDER BY Name`,
      );
      return result.recordset.map((r: any) => r.Name as string);
    } catch (err) {
      console.error('getDepartments failed -', (err as Error).message);
      return [];
    }
  }

  // ─── HRMSDEV: real designation list from Mst_Designation ──────────────────────
  async getDesignations() {
    const pool = await this.getPool();
    try {
      const result = await pool.request().query(
        `SELECT Name FROM Mst_Designation WHERE IsActive = 1 ORDER BY Name`,
      );
      return result.recordset.map((r: any) => r.Name as string);
    } catch (err) {
      console.error('getDesignations failed -', (err as Error).message);
      return [];
    }
  }

  // ─── HRMSDEV: company info for the logged-in user's company ────────────────────
  async getCompanyInfo(companyId: number) {
    const pool = await this.getPool();
    try {
      const result = await pool.request()
        .input('CompanyID', sql.Int, companyId)
        .query(
          `SELECT CompanyName, CompanyCode, ContactPerson, ContactEmail
           FROM Mst_Company
           WHERE CompanyID = @CompanyID AND IsActive = 1 AND Deleted = 0`,
        );
      const r = result.recordset[0];
      if (!r) return null;
      return {
        name:          r.CompanyName as string,
        code:          r.CompanyCode as string,
        contactPerson: r.ContactPerson ?? '',
        contactEmail:  r.ContactEmail ?? '',
      };
    } catch (err) {
      console.error('getCompanyInfo failed -', (err as Error).message);
      return null;
    }
  }

  // ─── HRMSDEV: office branches for the logged-in user's company ─────────────────
  async getBranches(companyId: number) {
    const pool = await this.getPool();
    try {
      const result = await pool.request()
        .input('CompanyID', sql.Int, companyId)
        .query(
          `SELECT BranchName, Address1, City, PhoneNo
           FROM CompanyBranches
           WHERE CompanyID = @CompanyID AND IsActive = 1
           ORDER BY BranchName`,
        );
      return result.recordset.map((r: any) => ({
        branchName: r.BranchName as string,
        address:    r.Address1 ?? '',
        city:       r.City ?? '',
        phone:      r.PhoneNo ?? '',
      }));
    } catch (err) {
      console.error('getBranches failed -', (err as Error).message);
      return [];
    }
  }

  // ─── HRMSDEV: active employee directory for the logged-in user's company ───────
  // Active only (Deleted = 0 AND EmploymentStatusID = 1), scoped to the company.
  async getEmployeeDirectory(companyId: number) {
    const pool = await this.getPool();
    try {
      const result = await pool.request()
        .input('CompanyID', sql.Int, companyId)
        .query(
          `SELECT EmployeeID, FullName, Code
           FROM Employee
           WHERE CompanyID = @CompanyID AND Deleted = 0 AND EmploymentStatusID = 1
           ORDER BY FullName`,
        );
      return result.recordset.map((r: any) => ({
        id:   r.EmployeeID as string,
        name: r.FullName as string,
        code: r.Code ?? '',
      }));
    } catch (err) {
      console.error('getEmployeeDirectory failed -', (err as Error).message);
      return [];
    }
  }

  // ─── AUTH ────────────────────────────────────────────────────────────────────

  async findUserById(userId: string) {
    const pool = await this.getPool();
    const result = await pool.request()
      .input('UserId', sql.VarChar, userId)
      .execute('usp_GetUserById');

    const row = result.recordset[0];
    if (!row) return null;
    return {
      userId:     row.user_id     as string,
      employeeId: row.employee_id as string,
      email:      row.email       as string,
      role:       row.role        as string,
      name:       row.name        as string,
    };
  }

  async findUserByEmailAndPassword(email: string, password: string) {
    const pool = await this.getPool();
    const result = await pool.request()
      .input('Email',    sql.NVarChar, email.toLowerCase())
      .input('Password', sql.NVarChar, password)
      .execute('usp_LoginUser');

    const row = result.recordset[0];
    if (!row) return null;
    return {
      userId:     row.user_id     as string,
      employeeId: row.employee_id as string,
      email:      row.email       as string,
      role:       row.role        as string,
      name:       row.name        as string,
    };
  }

  // ─── EMPLOYEES ───────────────────────────────────────────────────────────────

  async findEmployeeById(employeeId: string) {
    const pool = await this.getPool();
    const result = await pool.request()
      .input('EmployeeId', sql.VarChar, employeeId)
      .execute('usp_GetEmployeeById');

    return result.recordset[0] ?? null;
  }

  async getAllEmployees() {
    const pool = await this.getPool();
    const result = await pool.request().execute('usp_GetAllEmployees');

    return result.recordset.map((row) => ({
      ...row,
      certificates: JSON.parse(row.certificates_json || '[]'),
      form16: {
        year:        row.form16_year,
        baseSalary:  row.form16_base_salary,
        deductions:  row.form16_deductions,
        tax:         row.form16_tax,
        downloadUrl: row.form16_download_url,
      },
      joinDate: row.join_date,
    }));
  }

  async getPayrollSummary() {
    const pool = await this.getPool();
    const result = await pool.request().execute('usp_GetPayrollSummary');

    const row = result.recordset[0];
    const averageSalary = row.employeeCount > 0
      ? Math.round(row.totalPayroll / row.employeeCount)
      : 0;
    return {
      totalPayroll:    row.totalPayroll,
      averageSalary,
      highestSalary:   row.highestSalary,
      employeeCount:   row.employeeCount,
    };
  }

  // ─── LEAVE REQUESTS ──────────────────────────────────────────────────────────

  async getLeaveRequests(employeeId?: string | null) {
    const pool = await this.getPool();
    const result = await pool.request()
      .input('EmployeeId', sql.VarChar, employeeId ?? null)
      .execute('usp_GetLeaveRequests');

    return result.recordset.map((row) => ({
      ...row,
      leaveDate:   row.leave_date,
      startDate:   row.start_date,
      endDate:     row.end_date,
      requestCode: row.request_code,
      createdAt:   row.created_at,
      approvedAt:  row.approved_at,
      cancelledAt: row.cancelled_at,
    }));
  }

  async getLeaveRequestByCode(code: string) {
    const pool = await this.getPool();
    const result = await pool.request()
      .input('RequestCode', sql.NVarChar, code)
      .execute('usp_GetLeaveRequestByCode');

    const row = result.recordset[0];
    if (!row) return null;

    const toDateStr = (v: unknown) => {
      if (!v) return '';
      const d = v instanceof Date ? v : new Date(String(v));
      if (isNaN(d.getTime())) return '';
      const s = d.toISOString().slice(0, 10);
      return s <= '1900-01-02' ? '' : s;
    };

    const rawStart = toDateStr(row.start_date);
    const rawLeave = toDateStr(row.leave_date);
    const rawEnd   = toDateStr(row.end_date);
    const startDate = rawStart || rawLeave;
    const endDate   = rawEnd   || startDate;

    return {
      id:          row.id          as number,
      requestCode: row.request_code as string,
      employeeId:  row.employee_id  as string,
      leaveType:   row.leave_type   as string,
      startDate,
      endDate,
      leaveDate:   rawLeave,
      duration:    Number(row.duration) || 1,
      dayType:     row.day_type    as string,
      reason:      row.reason      as string,
      status:      row.status      as string,
    };
  }

  // ─── HRMSDEV: apply leave via USP_LeaveRequestSubmission ──────────────────────
  // Expects a real LeaveTypeId (number) + FromDate/ToDate. Returns { ok, message }.
  async createLeaveRequest(
    employeeId: string,
    body: { leaveTypeId: number; fromDate: string; toDate: string; reason?: string | null },
  ): Promise<{ ok: boolean; statusCode: number; message: string }> {
    const pool = await this.getPool();
    try {
      const result = await pool.request()
        .input('EmployeeId',  sql.VarChar,   employeeId)
        .input('LeaveTypeId', sql.Int,       body.leaveTypeId)
        .input('FromDate',    sql.Date,      body.fromDate)
        .input('ToDate',      sql.Date,      body.toDate)
        .input('Reason',      sql.NVarChar,  body.reason ?? null)
        .execute('USP_LeaveRequestSubmission');

      const row = result.recordset?.[0] ?? {};
      const statusCode = Number(row.StatusCode ?? 500);
      const message = String(row.Message ?? 'Unknown response from server.');
      return { ok: statusCode === 200, statusCode, message };
    } catch (err) {
      console.error('createLeaveRequest failed for', employeeId, '-', (err as Error).message);
      return { ok: false, statusCode: 500, message: 'Could not submit leave request. Please try again.' };
    }
  }

  // ─── HRMSDEV: a user's leave history via USP_GetLeaveHistory ──────────────────
  // Returns the list of the employee's leave applications (with real LeaveId + status).
  async getLeaveHistory(employeeId: string) {
    const pool = await this.getPool();
    try {
      const result = await pool.request()
        .input('EmployeeId', sql.VarChar, employeeId)
        .execute('USP_GetLeaveHistory');

      const rows = result.recordset ?? [];
      // Error/empty shape returns a StatusCode column instead of leave rows.
      if (!rows.length || rows[0].StatusCode !== undefined) {
        return [];
      }

      const toDateStr = (v: unknown) => {
        if (!v) return '';
        const d = v instanceof Date ? v : new Date(String(v));
        return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
      };

      return rows.map((r: any) => ({
        leaveId:   Number(r.LeaveId),
        leaveType: r.LeaveTypeName as string,
        fromDate:  toDateStr(r.FromDate),
        toDate:    toDateStr(r.ToDate),
        noOfDays:  Number(r.NoOfDays ?? 0),
        reason:    (r.Reason ?? '') as string,
        statusId:  Number(r.StatusId),
        status:    r.Status as string,
        appliedDate: toDateStr(r.AppliedDate),
      }));
    } catch (err) {
      console.error('getLeaveHistory failed for', employeeId, '-', (err as Error).message);
      return [];
    }
  }

  async approveLeaveRequest(code: string, approverId: string) {
    const pool = await this.getPool();
    await pool.request()
      .input('RequestCode', sql.NVarChar, code)
      .input('ApproverId',  sql.VarChar,  approverId)
      .execute('usp_ApproveLeaveRequest');

    return { requestCode: code, status: 'approved' };
  }

  async cancelLeaveRequest(code: string, employeeId: string) {
    const pool = await this.getPool();
    await pool.request()
      .input('RequestCode', sql.NVarChar, code)
      .input('EmployeeId',  sql.VarChar,  employeeId)
      .execute('usp_CancelLeaveRequest');

    return { requestCode: code, status: 'cancelled' };
  }

  async cancelLeaveRequestByCode(code: string, specificDates?: string[] | null) {
    const pool = await this.getPool();
    const cancelledDates = specificDates && specificDates.length > 0
      ? JSON.stringify(specificDates.map(d => new Date(d).toISOString().slice(0, 10)).sort())
      : null;

    const result = await pool.request()
      .input('RequestCode',    sql.NVarChar,           code)
      .input('CancelledDates', sql.NVarChar(sql.MAX),  cancelledDates)
      .execute('usp_CancelLeaveRequestByCode');

    const row = result.recordset[0];
    if (!row) return null;

    const toDateStr = (v: unknown) => {
      if (!v) return '';
      const d = v instanceof Date ? v : new Date(String(v));
      if (isNaN(d.getTime())) return '';
      const s = d.toISOString().slice(0, 10);
      return s <= '1900-01-02' ? '' : s;
    };

    const rawStart  = toDateStr(row.start_date);
    const rawLeave  = toDateStr(row.leave_date);
    const rawEnd    = toDateStr(row.end_date);
    const startDate = rawStart || rawLeave;
    const endDate   = rawEnd   || startDate;

    return {
      id:          row.id           as number,
      requestCode: row.request_code as string,
      employeeId:  row.employee_id  as string,
      leaveType:   row.leave_type   as string,
      startDate,
      endDate,
      leaveDate:   rawLeave,
      duration:    Number(row.duration) || 1,
      dayType:     row.day_type     as string,
      reason:      row.reason       as string,
      status:      row.status       as string,
    };
  }

  // ─── HRMSDEV: real leave balance via USP_EmployeeLeaveBalance ─────────────────
  // Returns one of two shapes:
  //   success → rows: { LeaveTypeId, OpeningBalance, Availed, ClosingBalance, ... }
  //   error   → single row: { StatusCode, Message }   (e.g. 404 not initialised)
  // We return { initialised, rows[] }. rows carry leaveTypeId so the chatbot can map
  // it to the real leave-type name from Mst_LeaveType.
  async getLeaveBalance(employeeId: string) {
    const pool = await this.getPool();
    let result: sql.IProcedureResult<any>;
    try {
      result = await pool.request()
        .input('EmployeeId', sql.VarChar, employeeId)
        .execute('USP_EmployeeLeaveBalance');
    } catch (err) {
      console.error('getLeaveBalance failed for', employeeId, '-', (err as Error).message);
      return { initialised: false, rows: [] as any[] };
    }

    const rows = result.recordset ?? [];
    // The error/empty shape returns a StatusCode column instead of balance data.
    if (!rows.length || rows[0].StatusCode !== undefined) {
      return { initialised: false, rows: [] as any[] };
    }

    return {
      initialised: true,
      rows: rows.map((r: any) => ({
        leaveTypeId:    Number(r.LeaveTypeId),
        openingBalance: Number(r.OpeningBalance ?? 0),
        availed:        Number(r.Availed ?? 0),
        closingBalance: Number(r.ClosingBalance ?? 0),
      })),
    };
  }

  // ─── COMPANY DATA ────────────────────────────────────────────────────────────

  async getCompanyData() {
    const pool = await this.getPool();
    let holidays:      Array<{ date: string; name: string }>  = [];
    let announcements: Array<{ date: string; title: string }> = [];

    try {
      const r = await pool.request().execute('usp_GetHolidays');
      holidays = r.recordset as Array<{ date: string; name: string }>;
    } catch { /* table may not exist */ }

    try {
      const r = await pool.request().execute('usp_GetAnnouncements');
      announcements = r.recordset as Array<{ date: string; title: string }>;
    } catch { /* table may not exist */ }

    return { holidays, announcements };
  }

  async getCompanyLogo() {
    const pool = await this.getPool();
    const result = await pool.request().execute('usp_GetCompanyLogo');
    return result.recordset[0]?.logo_url ?? null;
  }

  async ping() {
    const pool = await this.getPool();
    const result = await pool.request().execute('usp_Ping');
    return result.recordset[0] ?? null;
  }
}