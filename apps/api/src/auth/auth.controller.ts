import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { SendOtpDto } from './dto/send-otp.dto.js';
import { VerifyOtpDto } from './dto/verify-otp.dto.js';
import { CheckAccountDto } from './dto/check-account.dto.js';
import { CreateAccountDto } from './dto/create-account.dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('send-otp')
  sendOtp(@Body() sendOtpDto: SendOtpDto) {
    return this.authService.sendOtp(sendOtpDto.phone);
  }

  @Post('verify-otp')
  verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    return this.authService.verifyOtp(
      verifyOtpDto.phone,
      verifyOtpDto.otp,
    );
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