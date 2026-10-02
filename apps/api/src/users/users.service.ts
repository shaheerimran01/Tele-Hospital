import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    return this.prisma.user.create({
      data: createUserDto,
    });
  }

  // GET ALL USERS
  async findAll() {
    const users = await this.prisma.user.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        _count: {
          select: {
            orders: true,
          },
        },
        orders: {
          select: {
            id: true,
            status: true,
            totalAmount: true,
            createdAt: true,
          },
          take: 5,
        },
        addresses: true,
      },
    });

    return users.map((user) => {
      const u = user as any;
      const defaultAddress = user.addresses?.find((a) => a.isDefault) || user.addresses?.[0];
      
      const formattedAddress = defaultAddress
        ? `${defaultAddress.addressLine1}${defaultAddress.addressLine2 ? `, ${defaultAddress.addressLine2}` : ''}`
        : u.address || 'Address not provided';

      return {
        ...user,
        ordersCount: user._count?.orders ?? user.orders?.length ?? 0,
        address: formattedAddress,
      };
    });
  }

  // GET SINGLE USER DETAILS (With full order items & products included)
  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id,
      },
      include: {
        _count: {
          select: {
            orders: true,
          },
        },
        orders: {
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
        },
        addresses: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const u = user as any;
    const defaultAddress = user.addresses?.find((a) => a.isDefault) || user.addresses?.[0];

    const formattedAddress = defaultAddress
      ? `${defaultAddress.addressLine1}${defaultAddress.addressLine2 ? `, ${defaultAddress.addressLine2}` : ''}`
      : u.address || 'Address not provided';

    return {
      ...user,
      ordersCount: (user as any)._count?.orders ?? user.orders?.length ?? 0,
      address: formattedAddress,
    };
  }

  async remove(id: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.delete({
      where: {
        id,
      },
    });
  }
}