import { Args, Mutation, Resolver, Query, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginInput, RegisterInput, AuthResponse } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { User } from '../users/entities/user.entity';

@Resolver()
export class AuthResolver {
  constructor(private authService: AuthService) {}

  @Mutation(() => AuthResponse)
  async login(@Args('input') input: LoginInput): Promise<AuthResponse> {
    const user = await this.authService.validateUser(
      input.email,
      input.password,
    );

    return this.authService.login(user);
  }

  @Mutation(() => AuthResponse)
  async register(@Args('input') input: RegisterInput): Promise<AuthResponse> {
    return this.authService.register(input);
  }

  @Query(() => User)
  @UseGuards(JwtAuthGuard)
  async me(@Context() context): Promise<Partial<User>> {
    const { userId, email } = context.req.user;
    return { id: userId, email };
  }
}
