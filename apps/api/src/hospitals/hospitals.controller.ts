import { Controller, Get, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { HospitalsService } from './hospitals.service.js';
import { NearbyHospitalsQueryDto } from './dto/hospital.dto.js';

/** Public hospital search for the patient flow ("Browse Hospitals Near You"). */
@Controller('hospitals')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class HospitalsController {
  constructor(private readonly hospitals: HospitalsService) {}

  // GET /hospitals/nearby?intakeId=&userId=  or  ?latitude=&longitude=&radius=
  // Nearest first, each with the registered doctors who practise there.
  @Get('nearby')
  nearby(@Query() query: NearbyHospitalsQueryDto) {
    return this.hospitals.nearby(query);
  }
}
