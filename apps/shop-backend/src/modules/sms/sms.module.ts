import { Global, Module } from '@nestjs/common';
import { fetch as undiciFetch } from 'undici';
import { SMS_FETCH, SmsService } from './sms.service';

@Global()
@Module({
  providers: [{ provide: SMS_FETCH, useValue: undiciFetch }, SmsService],
  exports: [SmsService],
})
export class SmsModule {}
