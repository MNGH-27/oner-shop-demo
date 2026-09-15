import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserRole } from '../../common/enums/role.enum';
import { User } from '@prisma/client';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { OtpService } from './otp.service';
import { ChangePasswordDto } from './dto/change-password.dto';

export type AuthenticationMethod = 'password' | 'otp';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly otpService: OtpService,
  ) {}

  async register(dto: RegisterDto) {
    const user = await this.usersService.create({
      ...dto,
      role: UserRole.CUSTOMER,
    });

    return this.buildAuthResponse(user, 'password');
  }

  async loginAdmin(dto: LoginDto) {
    if (!dto.email) throw new UnauthorizedException('Email is required');
    const user = await this.validateCredentials(dto);
    if (user.role !== 'admin') {
      throw new UnauthorizedException('Admin access only');
    }
    return this.buildAuthResponse(user, 'password');
  }

  async loginCustomer(dto: LoginDto) {
    const user = await this.validateCredentials(dto);
    if (user.role !== 'customer') {
      throw new UnauthorizedException('Customer access only');
    }
    return this.buildAuthResponse(user, 'password');
  }

  requestOtp(phone: string, clientIp: string) {
    return this.otpService.request(phone, clientIp);
  }

  async verifyOtp(phone: string, code: string) {
    await this.otpService.verify(phone, code);
    const { user, isNewUser } =
      await this.usersService.findOrCreateOtpCustomer(phone);
    const auth = await this.buildAuthResponse(user, 'otp');
    return { ...auth, isNewUser };
  }

  changeCustomerPassword(
    userId: string,
    authenticationMethod: AuthenticationMethod,
    dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(
      userId,
      dto.newPassword,
      dto.currentPassword,
      authenticationMethod === 'otp',
    );
  }

  async getProfile(userId: string) {
    return this.usersService.findProfileById(userId);
  }

  private async validateCredentials(dto: LoginDto): Promise<User> {
    const user = (
      dto.phone
        ? await this.usersService.findByPhone(dto.phone, true)
        : dto.email
          ? await this.usersService.findByEmail(dto.email, true)
          : null
    ) as User | null;

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  private async buildAuthResponse(
    user: User | (Omit<User, 'password'> & { _id: string }),
    authenticationMethod: AuthenticationMethod,
  ) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      authenticationMethod,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        phone: user.phone,
        phoneVerifiedAt: user.phoneVerifiedAt,
        profileCompleted: user.profileCompleted,
      },
    };
  }
}
