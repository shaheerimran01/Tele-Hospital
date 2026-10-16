import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { HospitalsService } from '../../hospitals/hospitals.service.js';
import { CreateHospitalDto, ListHospitalsQueryDto, UpdateHospitalDto } from '../../hospitals/dto/hospital.dto.js';

/**
 * Hospitals directory for the admin panel (/hospitals in the admin app).
 * Same access model as the other admin endpoints (e.g. /admin/doctor-portal).
 */
@Controller('admin/hospitals')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class AdminHospitalsController {
  constructor(private readonly hospitals: HospitalsService) {}

  // GET /admin/hospitals?search=&page=&pageSize=
  @Get()
  list(@Query() query: ListHospitalsQueryDto) {
    return this.hospitals.list(query);
  }

  // GET /admin/hospitals/:id
  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.hospitals.findOne(id);
  }

  // POST /admin/hospitals
  @Post()
  create(@Body() dto: CreateHospitalDto) {
    return this.hospitals.create(dto);
  }

  // PATCH /admin/hospitals/:id
  @Patch(':id')
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateHospitalDto) {
    return this.hospitals.update(id, dto);
  }

  // DELETE /admin/hospitals/:id
  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.hospitals.remove(id);
  }
}
