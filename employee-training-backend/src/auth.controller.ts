import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import {
  expiredSessionCookie,
  getCookieValue,
  SESSION_COOKIE,
  sessionCookie,
  verifySessionToken,
} from './security.js';
import type { AuthUser } from './security.js';

interface LoginBody {
  email?: unknown;
  password?: unknown;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(
    @Body() body: LoginBody,
    @Res({ passthrough: true }) response: Response,
  ): { user: AuthUser } {
    if (
      typeof body?.email !== 'string' ||
      typeof body.password !== 'string' ||
      !body.email.trim() ||
      !body.password
    ) {
      throw new BadRequestException('Укажите почту и пароль');
    }

    const session = this.authService.login(body.email, body.password);
    response.setHeader('Set-Cookie', sessionCookie(session.token));
    return { user: session.user };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) response: Response): { success: true } {
    response.setHeader('Set-Cookie', expiredSessionCookie());
    return { success: true };
  }

  @Get('session')
  session(@Req() request: Request): { user: AuthUser | null } {
    const token = getCookieValue(request.headers.cookie, SESSION_COOKIE);
    return { user: token ? verifySessionToken(token) ?? null : null };
  }
}
