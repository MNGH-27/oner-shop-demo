import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '../../../common/enums/role.enum';
import { UsersService } from '../../users/users.service';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  const config = {
    getOrThrow: () => 'a-test-secret-that-is-longer-than-32-characters',
  } as unknown as ConfigService;

  it('rejects an existing user after the account is deactivated', async () => {
    const users = {
      findById: jest.fn().mockResolvedValue({
        id: 'user-id',
        email: 'user@example.com',
        role: UserRole.CUSTOMER,
        firstName: 'Test',
        lastName: 'User',
        isActive: false,
      }),
    } as unknown as UsersService;
    const strategy = new JwtStrategy(config, users);

    await expect(
      strategy.validate({
        sub: 'user-id',
        email: 'user@example.com',
        role: UserRole.CUSTOMER,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('returns the current database role for an active user', async () => {
    const users = {
      findById: jest.fn().mockResolvedValue({
        id: 'user-id',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
        firstName: 'Test',
        lastName: 'Admin',
        isActive: true,
      }),
    } as unknown as UsersService;
    const strategy = new JwtStrategy(config, users);

    await expect(
      strategy.validate({
        sub: 'user-id',
        email: 'old@example.com',
        role: UserRole.CUSTOMER,
        authenticationMethod: 'otp',
      }),
    ).resolves.toMatchObject({
      role: UserRole.ADMIN,
      authenticationMethod: 'otp',
    });
  });
});
