import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CurrentDoctor, DoctorAuthGuard, type DoctorTokenPayload } from '../doctors/doctor-auth.js';
import { DoctorsService } from '../doctors/doctors.service.js';
import { ConsultationPrescriptionsService } from './consultation-prescriptions.service.js';
import { SaveConsultationPrescriptionDto } from './dto/consultation-prescription.dto.js';

/**
 * Digital prescriptions written by the doctor (Doctor Portal).
 * Uses the doctor login token (Authorization: Bearer <doctor_token>); every
 * appointment is checked to belong to the logged-in doctor.
 */
@Controller('doctors/me/prescriptions')
@UseGuards(DoctorAuthGuard)
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class ConsultationPrescriptionsController {
  constructor(
    private readonly doctors: DoctorsService,
    private readonly prescriptions: ConsultationPrescriptionsService,
  ) {}

  private async approvedDoctor(auth: DoctorTokenPayload) {
    const doctor = await this.doctors.resolveDoctorForAuth(auth);
    if (doctor.status !== 'APPROVED') {
      throw new ForbiddenException('Your account is still being verified. You can write prescriptions once the Tabibistan Admin team approves it.');
    }
    return doctor;
  }

  // GET /doctors/me/prescriptions
  @Get()
  async list(@CurrentDoctor() auth: DoctorTokenPayload) {
    const doctor = await this.approvedDoctor(auth);
    return this.prescriptions.list(doctor.id);
  }

  // GET /doctors/me/prescriptions/draft?appointmentId=...  (auto-filled form + existing prescription)
  @Get('draft')
  async draft(@CurrentDoctor() auth: DoctorTokenPayload, @Query('appointmentId', new ParseUUIDPipe()) appointmentId: string) {
    const doctor = await this.approvedDoctor(auth);
    return this.prescriptions.draft(doctor.id, appointmentId);
  }

  // POST /doctors/me/prescriptions  { appointmentId, diagnosis, medicines[], labTests[], advice, patientAge, patientGender }
  @Post()
  async save(@CurrentDoctor() auth: DoctorTokenPayload, @Body() dto: SaveConsultationPrescriptionDto) {
    const doctor = await this.approvedDoctor(auth);
    return this.prescriptions.save(doctor.id, dto);
  }
}
