import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { DoctorsModule } from '../doctors/doctors.module.js';
import { PharmaciesModule } from '../pharmacies/pharmacies.module.js';
import { LabsModule } from '../labs/labs.module.js';

@Module({
  // send-otp / verify-otp for DOCTOR, PHARMACY and LAB hand over to those modules,
  // so /auth/* answers exactly like /doctors/auth/*, /pharmacies/auth/*, /labs/auth/*
  imports: [DoctorsModule, PharmaciesModule, LabsModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
