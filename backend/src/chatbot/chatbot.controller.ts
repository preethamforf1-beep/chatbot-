import { Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { ChatRequestDto } from './dto/chat-request.dto';
import { AuthService } from '../auth/auth.service';

@Controller('chatbot')
export class ChatbotController {
  constructor(
    private readonly chatbotService: ChatbotService,
    private readonly authService: AuthService,
  ) {}

  @Post('chat')
  async chat(@Body() body: ChatRequestDto, @Headers('authorization') authorization?: string) {
    const token = authorization?.split(' ')[1];
    let tokenPayload: Record<string, any> | null = null;

    if (token) {
      tokenPayload = this.authService.verifyAccessToken(token);
    }

    return this.chatbotService.chat(body.message, tokenPayload ?? undefined);
  }

  @Get('status')
  status() {
    return this.chatbotService.status();
  }
}
