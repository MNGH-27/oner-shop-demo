import { Injectable } from '@nestjs/common';
import { apiEntity } from '../../common/utils/api-entity';
import { PrismaService } from '../../database/prisma.service';
import { ContactMessageDto } from './dto/contact-message.dto';
import { NewsletterDto } from './dto/newsletter.dto';

@Injectable()
export class EngagementService {
  constructor(private readonly prisma: PrismaService) {}

  async createMessage(dto: ContactMessageDto) {
    const row = await this.prisma.contactMessage.create({
      data: {
        name: dto.name.trim(),
        phone: dto.phone.trim(),
        subject: dto.subject.trim(),
        message: dto.message.trim(),
      },
    });
    return { id: row.id, _id: row.id, createdAt: row.createdAt };
  }

  async subscribe(dto: NewsletterDto) {
    const email = dto.email.trim().toLowerCase();
    const row = await this.prisma.newsletterSubscriber.upsert({
      where: { email },
      update: { isActive: true },
      create: { email },
    });
    return apiEntity(row);
  }
}
