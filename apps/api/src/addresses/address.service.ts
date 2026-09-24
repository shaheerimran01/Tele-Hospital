import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateAddressDto } from './dto/create-address.dto.js';
import { UpdateAddressDto } from './dto/update-address.dto.js';

@Injectable()
export class AddressService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateAddressDto) {
    const addressCount = await this.prisma.address.count({
      where: {
        userId,
      },
    });

    const shouldBeDefault =
      dto.isDefault === true || addressCount === 0;

    if (shouldBeDefault) {
      await this.prisma.address.updateMany({
        where: {
          userId,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    }

    return this.prisma.address.create({
      data: {
        userId,

        label: dto.label,
        recipientName: dto.recipientName,
        phone: dto.phone,

        addressLine1: dto.addressLine1,
        addressLine2: dto.addressLine2,
        area: dto.area,
        city: dto.city,
        province: dto.province,
        postalCode: dto.postalCode,
        country: dto.country,

        latitude: dto.latitude,
        longitude: dto.longitude,

        isDefault: shouldBeDefault,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.address.findMany({
      where: {
        userId,
      },
      orderBy: [
        {
          isDefault: 'desc',
        },
        {
          createdAt: 'desc',
        },
      ],
    });
  }

  async findOne(userId: string, addressId: string) {
    const address = await this.prisma.address.findFirst({
      where: {
        id: addressId,
        userId,
      },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    return address;
  }

  async update(
    userId: string,
    addressId: string,
    dto: UpdateAddressDto,
  ) {
    const address = await this.prisma.address.findFirst({
      where: {
        id: addressId,
        userId,
      },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    if (dto.isDefault === true) {
      await this.prisma.address.updateMany({
        where: {
          userId,
          isDefault: true,
          id: {
            not: addressId,
          },
        },
        data: {
          isDefault: false,
        },
      });
    }

    return this.prisma.address.update({
      where: {
        id: addressId,
      },
      data: {
        label: dto.label,
        recipientName: dto.recipientName,
        phone: dto.phone,

        addressLine1: dto.addressLine1,
        addressLine2: dto.addressLine2,
        area: dto.area,
        city: dto.city,
        province: dto.province,
        postalCode: dto.postalCode,
        country: dto.country,

        latitude: dto.latitude,
        longitude: dto.longitude,

        isDefault: dto.isDefault,
      },
    });
  }

  async remove(userId: string, addressId: string) {
    const address = await this.prisma.address.findFirst({
      where: {
        id: addressId,
        userId,
      },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    await this.prisma.address.delete({
      where: {
        id: addressId,
      },
    });

    if (address.isDefault) {
      const nextAddress =
        await this.prisma.address.findFirst({
          where: {
            userId,
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

      if (nextAddress) {
        await this.prisma.address.update({
          where: {
            id: nextAddress.id,
          },
          data: {
            isDefault: true,
          },
        });
      }
    }

    return {
      message: 'Address deleted successfully',
    };
  }

  async setDefault(userId: string, addressId: string) {
    const address = await this.prisma.address.findFirst({
      where: {
        id: addressId,
        userId,
      },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    await this.prisma.address.updateMany({
      where: {
        userId,
        isDefault: true,
      },
      data: {
        isDefault: false,
      },
    });

    return this.prisma.address.update({
      where: {
        id: addressId,
      },
      data: {
        isDefault: true,
      },
    });
  }
}