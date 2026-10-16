import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import type { Request } from 'express';
import { AppointmentsService } from './appointments.service.js';
import { AppointmentResolutionService } from './appointment-resolution.service.js';
import { CreateAppointmentDto } from './dto/create-appointment.dto.js';
import { GetSlotsDto } from './dto/get-slots.dto.js';
import type { ConsultationServiceMode } from '../generated/prisma/enums.js';
import {
  AlternativeDoctorsQueryDto,
  ForwardRescheduleDto,
  PatientRescheduleResponseDto,
  RecommendAlternativeDto,
} from './dto/resolution.dto.js';

type RequestWithUser = Request & { user?: { id?: string } };

@Controller('appointments')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class AppointmentsController {
  constructor(
    private readonly appointmentsService: AppointmentsService,
    private readonly resolution: AppointmentResolutionService,
  ) {}

  // GET /appointments/available-slots?doctorId=&serviceMode=&clinicId=&date=YYYY-MM-DD
  // (declared before ":id" so it isn't treated as an id)
  @Get('available-slots')
  getAvailableSlots(@Query() query: GetSlotsDto) {
    return this.appointmentsService.getAvailableSlots(query);
  }

  // GET /appointments/pending-actions?userId=  (appointments waiting for the patient's reply)
  @Get('pending-actions')
  pendingActions(@Req() req: RequestWithUser) {
    return this.resolution.pendingForPatient(this.getUserId(req));
  }

  // POST /appointments
  @Post()
  create(@Req() req: RequestWithUser, @Body() dto: CreateAppointmentDto) {
    return this.appointmentsService.create(this.getUserId(req, dto.userId), dto);
  }

  // GET /appointments?userId=  (the patient's own appointments)
  @Get()
  findMine(@Req() req: RequestWithUser) {
    return this.appointmentsService.findForUser(this.getUserId(req));
  }

  // GET /appointments/:id?userId=
  @Get(':id')
  findOne(@Req() req: RequestWithUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.appointmentsService.findOne(this.getUserId(req), id);
  }

  // ---------------------------------------------------------------------------
  // Follow-up after a doctor reschedules or declines (admin <-> patient <-> doctor)
  // ---------------------------------------------------------------------------

  // POST /appointments/:id/forward-reschedule  { note? }  (admin -> patient)
  @Post(':id/forward-reschedule')
  forwardReschedule(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: ForwardRescheduleDto) {
    return this.resolution.forwardReschedule(id, dto.note);
  }

  // PATCH /appointments/:id/patient-reschedule-response
  //   { action: ACCEPT | PROPOSE_SLOT | REQUEST_NEW_DOCTOR, date?, startTime?, note? }
  @Patch(':id/patient-reschedule-response')
  patientResponse(
    @Req() req: RequestWithUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: PatientRescheduleResponseDto,
  ) {
    return this.resolution.patientResponse(this.getUserId(req, dto.userId), id, dto);
  }

  // GET /appointments/:id/alternative-doctors  (admin: doctors matching speciality and fee)
  @Get(':id/alternative-doctors')
  alternativeDoctors(@Param('id', new ParseUUIDPipe()) id: string, @Query() query: AlternativeDoctorsQueryDto) {
    return this.resolution.alternativeDoctors(id, { date: query.date, modes: query.modes });
  }

  // POST /appointments/:id/recommend-alternative  { doctorId, note? }  (admin -> patient)
  @Post(':id/recommend-alternative')
  recommendAlternative(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: RecommendAlternativeDto) {
    return this.resolution.recommendAlternative(id, dto.doctorId, dto.note, dto.serviceMode as ConsultationServiceMode | undefined);
  }

  // GET /appointments/:id/resolution  (admin: where the follow-up stands)
  @Get(':id/resolution')
  resolutionSummary(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.resolution.adminSummary(id);
  }

  /**
   * Same convention as the consultation endpoints: `req.user.id` when an auth
   * guard has set it, otherwise `?userId=`, the `x-user-id` header, or (for
   * POST) `userId` in the body.
   */
  private getUserId(req: RequestWithUser, fromBody?: string): string {
    const fromQuery = req.query?.userId;
    const fromHeader = req.headers['x-user-id'];
    const userId =
      req.user?.id ||
      (typeof fromQuery === 'string' ? fromQuery.trim() : undefined) ||
      (typeof fromHeader === 'string' ? fromHeader.trim() : undefined) ||
      fromBody;

    if (!userId) {
      throw new BadRequestException('Please log in to continue (userId missing)');
    }
    return userId;
  }
}
