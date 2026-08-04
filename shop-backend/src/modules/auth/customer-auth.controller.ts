import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UpdateUserDto } from '../users/dto/update-user.dto';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@ApiTags('Customer - Auth')
@Controller('auth')
export class CustomerAuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.loginCustomer(dto);
  }

  /*
   * TODO(phone-login): ورود مشتری با شماره همراه (OTP)
   * محل پیشنهادی endpointها (برای سایت Next.js فروشگاه):
   *   POST /auth/otp/request  { phone }
   *   POST /auth/otp/verify   { phone, code }
   * سرویس: AuthService.requestOtp / verifyOtp — ذخیره کد، ارسال SMS، صدور JWT بعد از تأیید.
   * پنل ادمین فعلاً ایمیل/رمز است؛ این مسیر برای مشتریان فروشگاه است.
   */

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @Get('me')
  me(@CurrentUser('id') userId: string) {
    return this.authService.getProfile(userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @Patch('me')
  updateProfile(@CurrentUser('id') userId: string, @Body() dto: UpdateUserDto) {
    const safeDto: UpdateUserDto = { ...dto };
    delete safeDto.role;
    return this.usersService.update(userId, safeDto);
  }
}
