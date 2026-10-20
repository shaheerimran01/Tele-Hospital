import { Controller, Get, Param, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { LabTestsService } from './lab-tests.service.js';
import { ListLabItemsQueryDto } from './dto/lab-tests.dto.js';

/** Lab tests & health packages (LabPackage table) for the website's Lab Tests page. */
@Controller('lab-tests')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class LabTestsController {
  constructor(private readonly labTests: LabTestsService) {}

  // GET /lab-tests/catalog  (the page's 4 sections and 22 category cards, with counts)
  @Get('catalog')
  catalog() {
    return this.labTests.catalog();
  }

  // GET /lab-tests?group=full-body&type=PACKAGE&search=&sort=popular&page=1&pageSize=24
  @Get()
  list(@Query() query: ListLabItemsQueryDto) {
    return this.labTests.list(query);
  }

  // GET /lab-tests/:slug  (details, with a package's tests grouped into panels)
  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.labTests.findOne(slug);
  }
}
