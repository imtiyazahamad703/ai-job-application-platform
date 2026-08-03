import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

import { User, UserDocument } from './schemas/user.schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const BCRYPT_SALT_ROUNDS = 12;

export interface AuthTokens {
  accessToken: string;
  expiresIn: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(
    dto: RegisterDto,
  ): Promise<{ user: UserDocument; tokens: AuthTokens }> {
    const existing = await this.userModel.findOne({ email: dto.email }).exec();
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);
    const user = await this.userModel.create({
      email: dto.email,
      passwordHash,
    });
    this.logger.log(`New user registered: ${user.email}`);

    const tokens = await this.generateAccessToken(user);
    return { user, tokens };
  }

  async login(
    dto: LoginDto,
  ): Promise<{ user: UserDocument; tokens: AuthTokens }> {
    const user = await this.userModel
      .findOne({ email: dto.email, isActive: true })
      .select('+passwordHash')
      .exec();

    if (!user) throw new UnauthorizedException('Invalid email or password');

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isPasswordValid)
      throw new UnauthorizedException('Invalid email or password');

    this.logger.log(`User logged in: ${user.email}`);
    const tokens = await this.generateAccessToken(user);
    return { user, tokens };
  }

  async generateRefreshToken(user: UserDocument): Promise<string> {
    const payload = {
      sub: user._id.toString(),
      email: user.email,
      type: 'refresh',
    };
    const secret = this.configService.getOrThrow<string>('JWT_SECRET');

    // Use sign with secret directly to avoid StringValue type issue
    const refreshToken = this.jwtService.sign(payload, {
      secret,
      expiresIn: '7d',
    });

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await this.userModel.updateOne(
      { _id: user._id },
      { $set: { refreshTokenHash } },
    );
    return refreshToken;
  }

  async refreshAccessToken(
    userId: string,
    refreshToken: string,
  ): Promise<AuthTokens> {
    const user = await this.userModel
      .findOne({ _id: userId, isActive: true })
      .select('+refreshTokenHash')
      .exec();

    if (!user?.refreshTokenHash)
      throw new UnauthorizedException('Invalid refresh token');

    const isValid = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!isValid)
      throw new UnauthorizedException('Invalid or expired refresh token');

    return this.generateAccessToken(user);
  }

  async logout(userId: string): Promise<void> {
    await this.userModel.updateOne(
      { _id: userId },
      { $unset: { refreshTokenHash: 1 } },
    );
  }

  private async generateAccessToken(user: UserDocument): Promise<AuthTokens> {
    const payload = { sub: user._id.toString(), email: user.email };
    const expiresIn = this.configService.get<string>('JWT_EXPIRATION', '15m');
    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: '15m',
    });
    return { accessToken, expiresIn: expiresIn ?? '15m' };
  }

  async googleLogin(
    profile: any,
  ): Promise<{ user: UserDocument; tokens: AuthTokens; refreshToken: string }> {
    let user = await this.userModel.findOne({ email: profile.email }).exec();

    if (!user) {
      // Create user without password
      user = await this.userModel.create({
        email: profile.email,
        passwordHash: 'GOOGLE_OAUTH',
        isEmailVerified: true,
      });
      this.logger.log(`New user registered via Google: ${user.email}`);
    }

    if (profile.refreshToken) {
      user.googleRefreshToken = profile.refreshToken;
      await user.save();
    }

    const tokens = await this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user);
    return { user, tokens, refreshToken };
  }
}
