import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import type { Request } from 'express';
import { AppointmentsService } from './appointments.service.js';
import { CreateAppointmentDto } from './dto/create-appointment.dto.js';
import { GetSlotsDto } from './dto/get-slots.dto.js';

type RequestWithUser = Request & { user?: { id?: string } };

@Controller('appointments')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  // GET /appointments/available-slots?doctorId=&serviceMode=&clinicId=&date=YYYY-MM-DD
  // (declared before ":id" so it isn't treated as an id)
  @Get('available-slots')
  getAvailableSlots(@Query() query: GetSlotsDto) {
    return this.appointmentsService.getAvailableSlots(query);
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
