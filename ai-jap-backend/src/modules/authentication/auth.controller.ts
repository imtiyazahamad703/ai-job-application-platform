import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiCookieAuth,
} from '@nestjs/swagger';
import type { Response, Request } from 'express';

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import type { UserDocument } from './schemas/user.schema';

const REFRESH_COOKIE = 'refresh_token';

const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

@ApiTags('Auth')
@UseGuards(JwtAuthGuard)
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiResponse({ status: 201, description: 'Account created successfully' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, tokens } = await this.authService.register(dto);
    const refreshToken = await this.authService.generateRefreshToken(user);
    res.cookie(REFRESH_COOKIE, refreshToken, getCookieOptions());

    return {
      message: 'Account created successfully',
      user: { id: user._id, email: user.email, createdAt: user.createdAt },
      accessToken: tokens.accessToken,
      expiresIn: tokens.expiresIn,
    };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, tokens } = await this.authService.login(dto);
    const refreshToken = await this.authService.generateRefreshToken(user);
    res.cookie(REFRESH_COOKIE, refreshToken, getCookieOptions());

    return {
      message: 'Login successful',
      user: { id: user._id, email: user.email },
      accessToken: tokens.accessToken,
      expiresIn: tokens.expiresIn,
    };
  }

  @Get('me')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get current authenticated user' })
  getMe(@CurrentUser() user: UserDocument) {
    return {
      id: user._id,
      email: user.email,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
    };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Refresh access token using HTTP-only cookie' })
  async refresh(@Req() req: Request) {
    const cookies = req.cookies as Record<string, string> | undefined;
    const refreshToken = cookies?.[REFRESH_COOKIE];

    if (!refreshToken) {
      return { message: 'No refresh token provided' };
    }

    const { JwtService } = await import('@nestjs/jwt');
    const jwtService = new JwtService({});
    let payload: { sub?: string };
    try {
      payload = jwtService.decode(refreshToken);
    } catch {
      return { message: 'Invalid refresh token format' };
    }

    if (!payload?.sub) return { message: 'Invalid refresh token' };

    const tokens = await this.authService.refreshAccessToken(
      payload.sub,
      refreshToken,
    );
    return {
      message: 'Token refreshed',
      accessToken: tokens.accessToken,
      expiresIn: tokens.expiresIn,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Logout and invalidate refresh token' })
  async logout(
    @CurrentUser() user: UserDocument,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(user._id.toString());
    res.clearCookie(REFRESH_COOKIE, { path: '/' });
    return { message: 'Logged out successfully' };
  }

  @Public()
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Initiate Google OAuth flow' })
  async googleAuth() {
    // Initiates the Google OAuth flow
  }

  @Public()
  @Get('google/redirect')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Google OAuth callback' })
  async googleAuthRedirect(
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { tokens, refreshToken } = await this.authService.googleLogin(req.user);
    res.cookie(REFRESH_COOKIE, refreshToken, getCookieOptions());
    // Redirect back to frontend dashboard with token
    // In production, we'd want to configure this origin properly
    res.redirect(`http://localhost:5173/dashboard?token=${tokens.accessToken}`);
  }
}
