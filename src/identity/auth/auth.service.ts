import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { User } from '../entities/user.entity';
import { Session } from '../entities/session.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

const BCRYPT_ROUNDS = 12;
const REFRESH_TOKEN_BCRYPT_ROUNDS = 10;
const REFRESH_TOKEN_TTL_DAYS = 7;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Session) private readonly sessionRepo: Repository<Session>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const exists = await this.userRepo.findOne({
      where: { email: dto.email, brandId: dto.brandId },
    });
    if (exists) {
      throw new ConflictException('User already registered for this tenant');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = this.userRepo.create({
      email: dto.email,
      passwordHash,
      brandId: dto.brandId,
      name: dto.name,
    });
    const saved = await this.userRepo.save(user);

    return this.issueTokens(saved);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.userRepo.findOne({
      where: { email: dto.email, brandId: dto.brandId },
    });

    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.issueTokens(user);
  }

  async refresh(dto: RefreshDto): Promise<AuthResponseDto> {
    const { sessionId, secret } = this.parseRefreshToken(dto.refreshToken);

    const session = await this.sessionRepo.findOne({
      where: { id: sessionId, revoked: false },
      relations: ['user'],
    });

    if (
      !session ||
      session.expiresAt < new Date() ||
      !(await bcrypt.compare(secret, session.refreshTokenHash))
    ) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.sessionRepo.update(sessionId, { revoked: true });

    return this.issueTokens(session.user);
  }

  private async issueTokens(user: User): Promise<AuthResponseDto> {
    const secret = randomBytes(32).toString('hex');
    const refreshTokenHash = await bcrypt.hash(secret, REFRESH_TOKEN_BCRYPT_ROUNDS);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);

    const session = await this.sessionRepo.save({
      userId: user.id,
      brandId: user.brandId,
      refreshTokenHash,
      expiresAt,
    });

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      brandId: user.brandId,
      sid: session.id,
    };
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('ACCESS_TOKEN_EXPIRATION'),
    });

    const refreshToken = Buffer.from(`${session.id}:${secret}`).toString('base64url');

    return { accessToken, refreshToken, userId: user.id, brandId: user.brandId };
  }

  private parseRefreshToken(token: string): { sessionId: string; secret: string } {
    try {
      const decoded = Buffer.from(token, 'base64url').toString();
      const colonIdx = decoded.indexOf(':');
      if (colonIdx === -1) throw new Error();
      return { sessionId: decoded.slice(0, colonIdx), secret: decoded.slice(colonIdx + 1) };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
