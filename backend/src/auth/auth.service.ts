import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HrmsDbService } from '../db/hrms-db.service';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessExpiresIn = '8h';
  private readonly refreshExpiresIn = '30d';

  constructor(
    private readonly config: ConfigService,
    private readonly hrmsDbService: HrmsDbService,
  ) {
    this.accessSecret = this.config.get<string>('ACCESS_TOKEN_SECRET') || 'dev_access_secret';
    this.refreshSecret = this.config.get<string>('REFRESH_TOKEN_SECRET') || 'dev_refresh_secret';
  }

  async login(email: string, password: string) {
    if (!email || !password) {
      throw new UnauthorizedException('Email and password are required');
    }

    // Fetch user from HRMSDEV (USP_Validateuser returns PasswordHash + profile)
    const row = await this.hrmsDbService.validateUser(email);
    if (!row) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (row.IsAccountLocked) {
      throw new UnauthorizedException('Account is locked. Contact administrator.');
    }

    // bcrypt: compares typed password against stored hash (salt is inside the hash)
    const isPasswordValid = await bcrypt.compare(password, row.PasswordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Map THEIR columns → the shape your chatbot/token expect
    const user = {
      userId:     row.Email,
      employeeId: row.EmployeeID,
      email:      row.Email,
      name:       row.FullName ?? row.Email,
      role:       this.mapRole(row.RoleName, row.RoleID),
    };

    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    return {
      success: true,
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: {
        id: user.userId,
        employeeId: user.employeeId,
        email: user.email,
        role: user.role,
        name: user.name,
      },
    };
  }

  // Maps HRMSDEV role → chatbot role string. Refine once you confirm their RoleNames.
  private mapRole(roleName?: string, roleId?: number): string {
    const name = (roleName ?? '').toLowerCase();
    if (roleId === 1 || name.includes('super') || name.includes('admin')) return 'admin';
    if (roleId === 2 || name.includes('hr')) return 'hr';
    return 'employee';
  }

  generateAccessToken(user: any) {
    return jwt.sign(
      {
        userId: user.userId,
        email: user.email,
        role: user.role,
        employeeId: user.employeeId,
        name: user.name,
      },
      this.accessSecret,
      { expiresIn: this.accessExpiresIn },
    );
  }

  generateRefreshToken(user: any) {
    return jwt.sign(
      { userId: user.userId },
      this.refreshSecret,
      { expiresIn: this.refreshExpiresIn },
    );
  }

  verifyAccessToken(token: string) {
    try {
      return jwt.verify(token, this.accessSecret) as Record<string, any>;
    } catch (error) {
      throw new UnauthorizedException('Expired session or invalid token');
    }
  }
}