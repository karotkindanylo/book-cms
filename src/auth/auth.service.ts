import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { RegisterInput, User } from './dto/auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    try {
      const user = await this.usersService.findByEmail(email);

      if (!user) {
        this.logger.warn(`Login attempt with non-existent email: ${email}`);
        throw new UnauthorizedException('Invalid credentials');
      }

      const isPasswordValid = await bcrypt.compare(pass, user.password);

      if (!isPasswordValid) {
        this.logger.warn(`Failed login attempt for user: ${email}`);
        throw new UnauthorizedException('Invalid credentials');
      }

      const { password, ...result } = user;
      return result;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Login error: ${error.message}`, error.stack);
      throw new UnauthorizedException('Authentication failed');
    }
  }

  async login(user: User) {
    const payload = { email: user.email, sub: user.id };

    try {
      this.logger.log(`User logged in: ${user.email}`);
      return {
        access_token: this.jwtService.sign(payload),
        user_id: user.id,
        name: user.name,
        email: user.email,
      };
    } catch (error) {
      this.logger.error(
        `Token generation error: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Failed to generate authentication token');
    }
  }

  async register(registerInput: RegisterInput) {
    try {
      const existingUser = await this.usersService.findByEmail(
        registerInput.email,
      );

      if (existingUser) {
        this.logger.warn(
          `Registration attempt with existing email: ${registerInput.email}`,
        );
        throw new ConflictException('User with this email already exists');
      }

      const salt = await bcrypt.genSalt();
      const hashedPassword = await bcrypt.hash(registerInput.password, salt);

      const user = await this.usersService.create({
        email: registerInput.email,
        password: hashedPassword,
        name: registerInput.name,
      });

      this.logger.log(`New user registered: ${user.email}`);
      const { password, ...userData } = user;

      return this.login(userData);
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      this.logger.error(`Registration error: ${error.message}`, error.stack);
      throw new BadRequestException(`Registration failed: ${error.message}`);
    }
  }

  verifyToken(token: string): object {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      this.logger.warn(`Invalid token: ${error.message}`);
      throw new UnauthorizedException('Invalid token');
    }
  }
}
