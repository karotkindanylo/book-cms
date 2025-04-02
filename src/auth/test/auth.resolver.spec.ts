import { Test, TestingModule } from '@nestjs/testing';
import { AuthResolver } from '../auth.resolver';
import { AuthService } from '../auth.service';
import { LoginInput, RegisterInput, AuthResponse } from '../dto/auth.dto';

const mockAuthService = {
  validateUser: jest.fn(),
  login: jest.fn(),
  register: jest.fn(),
};

describe('AuthResolver', () => {
  let resolver: AuthResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthResolver,
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    resolver = module.get<AuthResolver>(AuthResolver);
  });

  it('should login a user', async () => {
    const loginInput: LoginInput = {
      email: 'test@example.com',
      password: 'Test@1234',
    };
    const authResponse: AuthResponse = {
      access_token: 'jwt-token',
      user_id: '123',
      name: 'Test User',
      email: 'test@example.com',
    };

    mockAuthService.validateUser.mockResolvedValue({
      id: '123',
      email: loginInput.email,
      name: 'Test User',
    });
    mockAuthService.login.mockResolvedValue(authResponse);

    const result = await resolver.login({ ...loginInput });
    expect(result).toEqual(authResponse);
    expect(mockAuthService.validateUser).toHaveBeenCalledWith(
      loginInput.email,
      loginInput.password,
    );
    expect(mockAuthService.login).toHaveBeenCalled();
  });

  it('should register a user', async () => {
    const registerInput: RegisterInput = {
      email: 'newuser@example.com',
      password: 'NewUser@1234',
      name: 'New User',
    };
    const authResponse: AuthResponse = {
      access_token: 'jwt-token',
      user_id: '456',
      name: 'New User',
      email: 'newuser@example.com',
    };

    mockAuthService.register.mockResolvedValue(authResponse);

    const result = await resolver.register(registerInput);
    expect(result).toEqual(authResponse);
    expect(mockAuthService.register).toHaveBeenCalledWith(registerInput);
  });

  it('should return current user', async () => {
    const mockContext = {
      req: {
        user: {
          userId: '123',
          email: 'test@example.com',
        },
      },
    };

    const result = await resolver.me(mockContext);
    expect(result).toEqual({ id: '123', email: 'test@example.com' });
  });
});
