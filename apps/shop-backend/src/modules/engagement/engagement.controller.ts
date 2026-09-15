import { Body, Controller, Post } from '@nestjs/common';
import { ContactMessageDto } from './dto/contact-message.dto';
import { NewsletterDto } from './dto/newsletter.dto';
import { EngagementService } from './engagement.service';

@Controller('engagement')
export class EngagementController {
  constructor(private readonly engagement: EngagementService) {}

  @Post('contact')
  contact(@Body() dto: ContactMessageDto) {
    return this.engagement.createMessage(dto);
  }

  @Post('newsletter')
  newsletter(@Body() dto: NewsletterDto) {
    return this.engagement.subscribe(dto);
  }
}
