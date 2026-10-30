import { Body, Controller, HttpCode, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { SendOtpDto } from './dto/send-otp.dto.js';
import { VerifyOtpDto } from './dto/verify-otp.dto.js';
import { CheckAccountDto } from './dto/check-account.dto.js';
import { CreateAccountDto } from './dto/create-account.dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/send-otp   { phone, role?: 'USER' | 'DOCTOR' | 'PHARMACY' | 'LAB' }
   * Sends the code on WhatsApp (ENABLE_WHATSAPP_OTP=true) or prints it in the API console.
   * 429 when the number asked too often (3 per 10 minutes).
   */
  @Post('send-otp')
  @HttpCode(200)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  sendOtp(@Body() sendOtpDto: SendOtpDto) {
    return this.authService.sendOtp(sendOtpDto);
  }

  /**
   * POST /auth/verify-otp   { phone, code, role? }
   * DOCTOR / PHARMACY / LAB answer like their own verify endpoints (incl. session tokens).
   */
  @Post('verify-otp')
  @HttpCode(200)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    return this.authService.verifyOtp(verifyOtpDto);
  }

  @Post('check-account')
  checkAccount(@Body() checkAccountDto: CheckAccountDto) {
    return this.authService.checkAccount(checkAccountDto.phone);
  }

  @Post('create-account')
  createAccount(@Body() createAccountDto: CreateAccountDto) {
    return this.authService.createAccount(createAccountDto);
  }

  @Post('login')
  login(@Body() body: any) {
    return this.authService.login(body);
  }

  @Post('register')
  register(@Body() body: any) {
    return this.authService.register(body);
  }
}