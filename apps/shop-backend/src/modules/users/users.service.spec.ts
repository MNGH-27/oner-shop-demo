import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { UsersService } from './users.service';

describe('UsersService password changes', () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn<
        Promise<unknown>,
        [{ where: { id: string }; data: { password: string } }]
      >(),
    },
  };
  const service = new UsersService(prisma as unknown as PrismaService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requires the current password for a password-authenticated session', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'customer-id',
      password: await bcrypt.hash('old-password', 10),
    });

    await expect(
      service.changePassword('customer-id', 'new-password', 'wrong-password'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('accepts the current password and stores only a hash', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'customer-id',
      password: await bcrypt.hash('old-password', 10),
    });
    prisma.user.update.mockResolvedValue({});

    await service.changePassword('customer-id', 'new-password', 'old-password');

    const savedPassword = prisma.user.update.mock.calls[0]?.[0].data.password;
    expect(savedPassword).not.toBe('new-password');
    await expect(bcrypt.compare('new-password', savedPassword)).resolves.toBe(
      true,
    );
  });

  it('allows a verified OTP session to set a password without the old one', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'customer-id',
      password: await bcrypt.hash('generated-password', 10),
    });
    prisma.user.update.mockResolvedValue({});

    await expect(
      service.changePassword('customer-id', 'chosen-password', undefined, true),
    ).resolves.toEqual({ message: 'رمز عبور با موفقیت تغییر کرد' });
    expect(prisma.user.update).toHaveBeenCalledTimes(1);
  });
});
