import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User } from '../entities/user.entity';
import { Session } from '../entities/session.entity';

const mockUser: Partial<User> = {
  id: 'user-uuid-1',
  email: 'alice@example.com',
  passwordHash: bcrypt.hashSync('P@ssw0rd!', 1),
  brandId: 'brandA',
  name: 'Alice',
};

describe('AuthService', () => {
  let service: AuthService;

  const userRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };
  const sessionRepo = {
    save: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };
  const jwtService = { sign: jest.fn().mockReturnValue('signed-jwt') };
  const configService = { get: jest.fn().mockReturnValue('15m') };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Session), useValue: sessionRepo },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('creates user and returns token when email+brandId is unique', async () => {
      userRepo.findOne.mockResolvedValue(null);
      userRepo.create.mockReturnValue(mockUser);
      userRepo.save.mockResolvedValue(mockUser);
      sessionRepo.save.mockResolvedValue({ id: 'session-uuid-1' });

      const result = await service.register({
        email: 'alice@example.com',
        password: 'P@ssw0rd!',
        brandId: 'brandA',
      });

      expect(result.accessToken).toBe('signed-jwt');
      expect(result.userId).toBe('user-uuid-1');
      expect(result.brandId).toBe('brandA');
      expect(userRepo.save).toHaveBeenCalledTimes(1);
    });

    it('throws ConflictException when email+brandId already exists', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);

      await expect(
        service.register({ email: 'alice@example.com', password: 'P@ssw0rd!', brandId: 'brandA' }),
      ).rejects.toThrow(ConflictException);

      expect(userRepo.save).not.toHaveBeenCalled();
    });

    it('hashes the password before saving', async () => {
      userRepo.findOne.mockResolvedValue(null);
      userRepo.create.mockImplementation((data) => data);
      userRepo.save.mockImplementation((data) => Promise.resolve({ ...data, id: 'new-uuid' }));
      sessionRepo.save.mockResolvedValue({ id: 'session-uuid-1' });

      await service.register({
        email: 'bob@example.com',
        password: 'secret123',
        brandId: 'brandA',
      });

      const createdArg = userRepo.create.mock.calls[0][0];
      expect(createdArg.passwordHash).not.toBe('secret123');
      expect(await bcrypt.compare('secret123', createdArg.passwordHash)).toBe(true);
    });

    it('scopes conflict check to the same brandId (same email is OK in different tenants)', async () => {
      userRepo.findOne.mockResolvedValue(null);
      userRepo.create.mockReturnValue({ ...mockUser, brandId: 'brandB' });
      userRepo.save.mockResolvedValue({ ...mockUser, id: 'user-uuid-2', brandId: 'brandB' });
      sessionRepo.save.mockResolvedValue({ id: 'session-uuid-1' });

      const result = await service.register({
        email: 'alice@example.com',
        password: 'P@ssw0rd!',
        brandId: 'brandB',
      });

      expect(result.brandId).toBe('brandB');
      expect(userRepo.findOne).toHaveBeenCalledWith({
        where: { email: 'alice@example.com', brandId: 'brandB' },
      });
    });
  });

  describe('login', () => {
    it('returns a token for valid credentials', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);
      sessionRepo.save.mockResolvedValue({ id: 'session-uuid-1' });

      const result = await service.login({
        email: 'alice@example.com',
        password: 'P@ssw0rd!',
        brandId: 'brandA',
      });

      expect(result.accessToken).toBe('signed-jwt');
    });

    it('throws UnauthorizedException when user does not exist', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(
        service.login({ email: 'ghost@example.com', password: 'P@ssw0rd!', brandId: 'brandA' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for wrong password', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);

      await expect(
        service.login({ email: 'alice@example.com', password: 'wrong-pass', brandId: 'brandA' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('does not allow cross-tenant login with the same credentials', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(
        service.login({ email: 'alice@example.com', password: 'P@ssw0rd!', brandId: 'brandB' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(userRepo.findOne).toHaveBeenCalledWith({
        where: { email: 'alice@example.com', brandId: 'brandB' },
      });
    });
  });
});
