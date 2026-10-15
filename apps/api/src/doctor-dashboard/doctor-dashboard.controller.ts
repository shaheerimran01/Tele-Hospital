import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CurrentDoctor, DoctorAuthGuard, type DoctorTokenPayload } from '../doctors/doctor-auth.js';
import { DoctorsService } from '../doctors/doctors.service.js';
import { DoctorDashboardService } from './doctor-dashboard.service.js';
import {
  DoctorAppointmentStatusDto,
  DoctorRescheduleDto,
  DoctorSlotsQueryDto,
} from './dto/doctor-dashboard.dto.js';

/**
 * Doctor-only endpoints for the web doctor dashboard (/consult-doctors/doctor-dashboard).
 * Uses the separate doctor login token (Authorization: Bearer <doctor_token>), never the patient login.
 * Every appointment is checked to belong to the logged-in doctor.
 */
@Controller('doctors/me')
@UseGuards(DoctorAuthGuard)
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class DoctorDashboardController {
  constructor(
    private readonly doctors: DoctorsService,
    private readonly dashboard: DoctorDashboardService,
  ) {}

  /** Appointment actions are only for doctors whose profile the admin has approved. */
  private async approvedDoctor(auth: DoctorTokenPayload) {
    const doctor = await this.doctors.resolveDoctorForAuth(auth);
    if (doctor.status !== 'APPROVED') {
      throw new ForbiddenException(
        doctor.status === 'REJECTED'
          ? 'Your account application was rejected. Please contact Tabibistan Support to update your PMDC credentials.'
          : 'Your account is still being verified. You can manage appointments once the Tabibistan Admin team approves it.',
      );
    }
    return doctor;
  }

  // GET /doctors/me/dashboard
  @Get('dashboard')
  async getDashboard(@CurrentDoctor() auth: DoctorTokenPayload) {
    const doctor = await this.doctors.resolveDoctorForAuth(auth);
    return this.dashboard.getDashboard(doctor.id);
  }

  // PATCH /doctors/me/appointments/:id/status  { status: CONFIRMED | COMPLETED | CANCELLED, reason (required to decline) }
  @Patch('appointments/:id/status')
  async updateStatus(
    @CurrentDoctor() auth: DoctorTokenPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: DoctorAppointmentStatusDto,
  ) {
    const doctor = await this.approvedDoctor(auth);
    return this.dashboard.updateStatus(doctor.id, id, dto.status, dto.reason);
  }

  // GET /doctors/me/appointments/:id/slots?date=YYYY-MM-DD  (free times for rescheduling)
  @Get('appointments/:id/slots')
  async slots(
    @CurrentDoctor() auth: DoctorTokenPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query() query: DoctorSlotsQueryDto,
  ) {
    const doctor = await this.approvedDoctor(auth);
    return this.dashboard.slots(doctor.id, id, query.date);
  }

  // PATCH /doctors/me/appointments/:id/reschedule  { date, startTime, reason }
  @Patch('appointments/:id/reschedule')
  async reschedule(
    @CurrentDoctor() auth: DoctorTokenPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: DoctorRescheduleDto,
  ) {
    const doctor = await this.approvedDoctor(auth);
    return this.dashboard.reschedule(doctor.id, id, dto.date, dto.startTime, dto.reason);
  }
}
