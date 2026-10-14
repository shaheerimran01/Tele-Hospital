import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { DoctorAdminService } from './doctor-admin.service.js';
import {
  AdminAppointmentsQueryDto,
  AdminDoctorsQueryDto,
  AdminNotificationsQueryDto,
  AdminSearchQueryDto,
  UpdateAppointmentStatusDto,
  UpdateDoctorStatusAdminDto,
} from './dto/doctor-admin.dto.js';

/**
 * Admin "Doctor Portal" endpoints used by apps/admin (/doctor-dashboard).
 * Like the other admin endpoints, these are not behind an auth guard yet.
 */
@Controller('admin/doctor-portal')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class DoctorAdminController {
  constructor(private readonly service: DoctorAdminService) {}

  // GET /admin/doctor-portal/overview
  @Get('overview')
  overview() {
    return this.service.getOverview();
  }

  // GET /admin/doctor-portal/counts  (sidebar badges)
  @Get('counts')
  counts() {
    return this.service.getCounts();
  }

  // --- Doctors ---------------------------------------------------------------

  @Get('doctors')
  listDoctors(@Query() query: AdminDoctorsQueryDto) {
    return this.service.listDoctors(query);
  }

  @Get('doctors/:id')
  getDoctor(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.getDoctor(id);
  }

  @Patch('doctors/:id/status')
  updateDoctorStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateDoctorStatusAdminDto,
  ) {
    return this.service.updateDoctorStatus(id, dto);
  }

  // --- Patients --------------------------------------------------------------

  @Get('patients')
  listPatients(@Query() query: AdminSearchQueryDto) {
    return this.service.listPatients(query);
  }

  @Get('patients/:id')
  getPatient(@Param('id') id: string) {
    return this.service.getPatient(id);
  }

  // --- Appointments ----------------------------------------------------------

  @Get('appointments')
  listAppointments(@Query() query: AdminAppointmentsQueryDto) {
    return this.service.listAppointments(query);
  }

  @Get('appointments/:id')
  getAppointment(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.getAppointment(id);
  }

  @Patch('appointments/:id/status')
  updateAppointmentStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateAppointmentStatusDto,
  ) {
    return this.service.updateAppointmentStatus(id, dto);
  }

  // --- Notifications (doctor + appointment types only) -----------------------

  @Get('notifications')
  listNotifications(@Query() query: AdminNotificationsQueryDto) {
    return this.service.listNotifications(query);
  }

  // Declared before any ":id" route on purpose
  @Patch('notifications/read-all')
  markAllRead() {
    return this.service.markAllNotificationsRead();
  }
}
