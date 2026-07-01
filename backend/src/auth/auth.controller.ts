import { Body, Controller, Get, Headers, HttpCode, Post, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginRequestDto } from './dto/login-request.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: LoginRequestDto) {
    return this.authService.login(body.email, body.password);
  }

  @Post('logout')
  @HttpCode(200)
  async logout() {
    return { success: true, message: 'Logged out successfully' };
  }

  @Get('verify')
  async verify(@Headers('authorization') authorization?: string) {
    const token = authorization?.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException('Signature missing');
    }

    const payload = this.authService.verifyAccessToken(token);
    return { success: true, user: payload };
  }
}
