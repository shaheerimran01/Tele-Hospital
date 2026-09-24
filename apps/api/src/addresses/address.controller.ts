import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { AddressService } from './address.service.js';
import { CreateAddressDto } from './dto/create-address.dto.js';
import { UpdateAddressDto } from './dto/update-address.dto.js';

@Controller('addresses')
export class AddressController {
  constructor(
    private readonly addressService: AddressService,
  ) {}

  @Post()
  create(
    @Query('userId') userId: string,
    @Body() dto: CreateAddressDto,
  ) {
    return this.addressService.create(userId, dto);
  }

  @Get()
  findAll(@Query('userId') userId: string) {
    return this.addressService.findAll(userId);
  }

  @Get(':id')
  findOne(
    @Query('userId') userId: string,
    @Param('id') addressId: string,
  ) {
    return this.addressService.findOne(
      userId,
      addressId,
    );
  }

  @Patch(':id')
  update(
    @Query('userId') userId: string,
    @Param('id') addressId: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.addressService.update(
      userId,
      addressId,
      dto,
    );
  }

  @Delete(':id')
  remove(
    @Query('userId') userId: string,
    @Param('id') addressId: string,
  ) {
    return this.addressService.remove(
      userId,
      addressId,
    );
  }

  @Patch(':id/default')
  setDefault(
    @Query('userId') userId: string,
    @Param('id') addressId: string,
  ) {
    return this.addressService.setDefault(
      userId,
      addressId,
    );
  }
}