import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { UserRole } from '../../common/enums/role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { SetUserActiveDto } from './dto/set-user-active.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

class UserQueryDto extends PaginationDto {
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}

@ApiTags('Admin - Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Create user/admin' })
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Users overview stats' })
  getStats() {
    return this.usersService.getStats();
  }

  @Get()
  @ApiOperation({ summary: 'List / search users' })
  findAll(@Query() query: UserQueryDto) {
    return this.usersService.findAll(query.page, query.limit, {
      role: query.role,
      search: query.search,
      isActive: query.isActive,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'User detail' })
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Patch(':id/active')
  @ApiOperation({ summary: 'Activate / deactivate user' })
  setActive(@Param('id') id: string, @Body() dto: SetUserActiveDto) {
    return this.usersService.setActive(id, dto.isActive);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
