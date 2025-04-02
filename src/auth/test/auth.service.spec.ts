import * as bcrypt from 'bcrypt';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { UsersService } from '../../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { RegisterInput, User } from '../dto/auth.dto';

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;

  const mockUser: User = {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
  };

  const mockUsersService = {
    findByEmail: jest.fn(),
    create: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mockToken'),
    verify: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('should return user data without password when credentials are valid', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        ...mockUser,
        password: await bcrypt.hash('password', 10),
      });

      jest
        .spyOn(bcrypt, 'compare')
        .mockImplementation((password: string, hashedPassword: string) => {
          return Promise.resolve(true);
        });

      const result = await authService.validateUser(
        'test@example.com',
        'password',
      );
      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(
        authService.validateUser('test@example.com', 'password'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is incorrect', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        ...mockUser,
        password: await bcrypt.hash('password', 10),
      });

      jest
        .spyOn(bcrypt, 'compare')
        .mockImplementation((password: string, hashedPassword: string) => {
          return Promise.resolve(false);
        });

      await expect(
        authService.validateUser('test@example.com', 'wrongpassword'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('login', () => {
    it('should return access token and user details', async () => {
      const result = await authService.login(mockUser);

      expect(result).toEqual({
        access_token: 'mockToken',
        user_id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
      });
    });
  });

  describe('register', () => {
    it('should register a new user and return authentication response', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue(mockUser);

      const registerInput: RegisterInput = {
        email: 'newuser@example.com',
        password: 'StrongP@ss123',
        name: 'New User',
      };

      const result = await authService.register(registerInput);

      expect(result).toEqual({
        access_token: 'mockToken',
        user_id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
      });
    });

    it('should throw ConflictException if email is already taken', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);

      await expect(
        authService.register({
          email: 'test@example.com',
          password: 'StrongP@ss123',
          name: 'Test User',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('verifyToken', () => {
    it('should return decoded token if valid', () => {
      mockJwtService.verify.mockReturnValue({
        email: 'test@example.com',
        sub: '1',
      });

      const result = authService.verifyToken('validToken');
      expect(result).toEqual({ email: 'test@example.com', sub: '1' });
    });

    it('should throw UnauthorizedException if token is invalid', () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      expect(() => authService.verifyToken('invalidToken')).toThrow(
        UnauthorizedException,
      );
    });
  });
});
