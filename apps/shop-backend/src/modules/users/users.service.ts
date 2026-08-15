import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';
import { UserRole } from '../../common/enums/role.enum';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserDocument } from './schemas/user.schema';

function emailFromPhone(phone: string): string {
  return `${phone}@phone.local`;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async create(dto: CreateUserDto): Promise<UserDocument> {
    const phone = dto.phone.trim();

    const phoneExists = await this.userModel.findOne({ phone }).exec();
    if (phoneExists) {
      throw new BadRequestException('این شماره همراه قبلاً ثبت شده است');
    }

    const email = (dto.email?.trim().toLowerCase() || emailFromPhone(phone));
    const emailExists = await this.userModel.findOne({ email }).exec();
    if (emailExists) {
      throw new BadRequestException('این ایمیل قبلاً ثبت شده است');
    }

    const hashed = await bcrypt.hash(dto.password, 10);
    return this.userModel.create({
      ...dto,
      phone,
      email,
      password: hashed,
      role: dto.role ?? UserRole.CUSTOMER,
    });
  }

  async findAll(
    page = 1,
    limit = 20,
    filters?: { role?: UserRole; search?: string; isActive?: boolean },
  ) {
    const filter: Record<string, unknown> = {};
    if (filters?.role) filter.role = filters.role;
    if (filters?.isActive !== undefined) filter.isActive = filters.isActive;
    if (filters?.search) {
      filter.$or = [
        { phone: { $regex: filters.search, $options: 'i' } },
        { firstName: { $regex: filters.search, $options: 'i' } },
        { lastName: { $regex: filters.search, $options: 'i' } },
        { email: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.userModel
        .find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec(),
      this.userModel.countDocuments(filter).exec(),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getStats() {
    const [byRole, activeCount, total] = await Promise.all([
      this.userModel.aggregate<{ _id: string; count: number }>([
        { $group: { _id: '$role', count: { $sum: 1 } } },
      ]),
      this.userModel.countDocuments({ isActive: true }).exec(),
      this.userModel.countDocuments().exec(),
    ]);

    return {
      total,
      active: activeCount,
      inactive: total - activeCount,
      byRole: {
        admin: byRole.find((r) => r._id === UserRole.ADMIN)?.count ?? 0,
        customer: byRole.find((r) => r._id === UserRole.CUSTOMER)?.count ?? 0,
      },
    };
  }

  async setActive(id: string, isActive: boolean): Promise<UserDocument> {
    const user = await this.userModel
      .findByIdAndUpdate(id, { isActive }, { new: true })
      .exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findById(id: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id).exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByEmail(email: string, withPassword = false): Promise<UserDocument | null> {
    const query = this.userModel.findOne({ email: email.toLowerCase() });
    if (withPassword) query.select('+password');
    return query.exec();
  }

  async findByPhone(phone: string, withPassword = false): Promise<UserDocument | null> {
    const query = this.userModel.findOne({ phone });
    if (withPassword) query.select('+password');
    return query.exec();
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserDocument> {
    const payload: UpdateUserDto & { password?: string } = { ...dto };

    if (dto.phone) {
      const phoneExists = await this.userModel
        .findOne({ phone: dto.phone, _id: { $ne: id } })
        .exec();
      if (phoneExists) {
        throw new BadRequestException('این شماره همراه قبلاً ثبت شده است');
      }
    }

    if (dto.password) {
      payload.password = await bcrypt.hash(dto.password, 10);
    }

    const user = await this.userModel
      .findByIdAndUpdate(id, payload, { new: true })
      .exec();

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async remove(id: string): Promise<void> {
    const result = await this.userModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException('User not found');
  }
}
