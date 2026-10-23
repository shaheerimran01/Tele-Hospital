import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { CatalogService } from './catalog.service.js';
import { CreateCatalogItemDto, ListCatalogItemsQueryDto, UpdateCatalogItemDto } from './dto/catalog.dto.js';

/** Administrative master diagnostics catalog, backed only by LabPackage (lab_packages). */
@Controller('catalog/items')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  list(@Query() query: ListCatalogItemsQueryDto) {
    return this.catalog.list(query);
  }

  @Post()
  create(@Body() dto: CreateCatalogItemDto) {
    return this.catalog.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCatalogItemDto) {
    return this.catalog.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.catalog.remove(id);
  }
}
