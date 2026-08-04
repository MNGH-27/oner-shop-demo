import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserRole } from '../../common/enums/role.enum';
import { UserDocument } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const user = await this.usersService.create({
      ...dto,
      role: UserRole.CUSTOMER,
    });

    return this.buildAuthResponse(user);
  }

  async loginAdmin(dto: LoginDto) {
    const user = await this.validateCredentials(dto);
    if (user.role !== UserRole.ADMIN) {
      throw new UnauthorizedException('Admin access only');
    }
    return this.buildAuthResponse(user);
  }

  async loginCustomer(dto: LoginDto) {
    const user = await this.validateCredentials(dto);
    if (user.role !== UserRole.CUSTOMER) {
      throw new UnauthorizedException('Customer access only');
    }
    return this.buildAuthResponse(user);
  }

  async getProfile(userId: string) {
    return this.usersService.findById(userId);
  }

  private async validateCredentials(dto: LoginDto): Promise<UserDocument> {
    const user = await this.usersService.findByEmail(dto.email, true);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  private async buildAuthResponse(user: UserDocument) {
    const payload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        phone: user.phone,
      },
    };
  }
}
