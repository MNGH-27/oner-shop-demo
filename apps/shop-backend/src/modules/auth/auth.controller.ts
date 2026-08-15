import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@ApiTags('Admin - Auth')
@Controller('admin/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.loginAdmin(dto);
  }

  /*
   * TODO(phone-login): اگر ادمین هم ورود با موبایل خواست:
   *   POST /admin/auth/otp/request و POST /admin/auth/otp/verify
   * فعلاً ورود ادمین فقط ایمیل/رمز است.
   */

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('me')
  me(@CurrentUser('id') userId: string) {
    return this.authService.getProfile(userId);
  }
}
