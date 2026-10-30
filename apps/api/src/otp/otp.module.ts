import { Global, Module } from '@nestjs/common';
import { WhatsAppService } from '../whatsapp/whatsapp.service.js';
import { OtpService } from './otp.service.js';

/** OTP + WhatsApp delivery for every account type (global: inject OtpService anywhere) */
@Global()
@Module({
  providers: [WhatsAppService, OtpService],
  exports: [WhatsAppService, OtpService],
})
export class OtpModule {}
