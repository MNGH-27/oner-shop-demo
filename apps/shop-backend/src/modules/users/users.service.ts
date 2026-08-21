import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole as PrismaUserRole, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { withoutPassword } from '../../common/utils/api-entity';
import { UserRole } from '../../common/enums/role.enum';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
const emailFromPhone = (phone: string) => `${phone}@phone.local`;
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}
  async create(dto: CreateUserDto) {
    const phone = dto.phone.trim(); const email = dto.email?.trim().toLowerCase() || emailFromPhone(phone);
    if (await this.prisma.user.findFirst({ where: { OR: [{ phone }, { email }] } })) throw new BadRequestException('این شماره همراه یا ایمیل قبلاً ثبت شده است');
    const user = await this.prisma.user.create({ data: { email, phone, password: await bcrypt.hash(dto.password, 10), firstName: dto.firstName, lastName: dto.lastName, role: (dto.role ?? UserRole.CUSTOMER) as PrismaUserRole, isActive: dto.isActive ?? true } });
    return withoutPassword(user);
  }
  private where(filters?: { role?: UserRole; search?: string; isActive?: boolean }): Prisma.UserWhereInput {
    return { ...(filters?.role ? { role: filters.role as PrismaUserRole } : {}), ...(filters?.isActive !== undefined ? { isActive: filters.isActive } : {}), ...(filters?.search ? { OR: ['phone','firstName','lastName','email'].map((key) => ({ [key]: { contains: filters.search, mode: 'insensitive' } })) as Prisma.UserWhereInput[] } : {}) };
  }
  async findAll(page=1, limit=20, filters?: { role?: UserRole; search?: string; isActive?: boolean }) { const where=this.where(filters); const [rows,total]=await Promise.all([this.prisma.user.findMany({where,skip:(page-1)*limit,take:limit,orderBy:{createdAt:'desc'}}),this.prisma.user.count({where})]); return {items:rows.map(withoutPassword),meta:{total,page,limit,totalPages:Math.ceil(total/limit)||1}}; }
  async getStats() { const [total,active,admin,customer]=await Promise.all([this.prisma.user.count(),this.prisma.user.count({where:{isActive:true}}),this.prisma.user.count({where:{role:'admin'}}),this.prisma.user.count({where:{role:'customer'}})]); return {total,active,inactive:total-active,byRole:{admin,customer}}; }
  async setActive(id:string,isActive:boolean){await this.require(id);return withoutPassword(await this.prisma.user.update({where:{id},data:{isActive}}));}
  private async require(id:string){const user=await this.prisma.user.findUnique({where:{id}});if(!user)throw new NotFoundException('User not found');return user;}
  async findById(id:string){return withoutPassword(await this.require(id));}
  findByEmail(email:string,withPassword=false){return this.prisma.user.findUnique({where:{email:email.toLowerCase()}}).then((u)=>u ? (withPassword?u:withoutPassword(u)) : null);}
  findByPhone(phone:string,withPassword=false){return this.prisma.user.findUnique({where:{phone}}).then((u)=>u ? (withPassword?u:withoutPassword(u)) : null);}
  async update(id:string,dto:UpdateUserDto){await this.require(id);if(dto.phone&&await this.prisma.user.findFirst({where:{phone:dto.phone,NOT:{id}}}))throw new BadRequestException('این شماره همراه قبلاً ثبت شده است');const data:Prisma.UserUpdateInput={...dto,role:dto.role as PrismaUserRole|undefined,password:dto.password?await bcrypt.hash(dto.password,10):undefined};return withoutPassword(await this.prisma.user.update({where:{id},data}));}
  async remove(id:string){await this.require(id);await this.prisma.user.delete({where:{id}});}
}
