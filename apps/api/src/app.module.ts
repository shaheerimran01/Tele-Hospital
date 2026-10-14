import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { UsersModule } from './users/users.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { AddressModule } from './addresses/address.module.js';
import { ProductsModule } from './products/products.module.js';
import { CartModule } from './cart/cart.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { PrescriptionsModule } from './prescriptions/prescriptions.module.js';
import { UserNotificationsModule } from './user-notifications/user-notifications.module.js';
import { PharmaciesModule } from './pharmacies/pharmacies.module.js';
import { PharmacyProductsModule } from './pharmacy-products/pharmacy-products.module.js';
import { ConsultationModule } from './consultation/consultation.module.js';
import { DoctorsModule } from './doctors/doctors.module.js';
import { AppointmentsModule } from './appointments/appointments.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    AuthModule,
    AddressModule,
    ProductsModule,
    CartModule,
    OrdersModule,
    NotificationsModule,
    PrescriptionsModule,
    UserNotificationsModule,
    PharmaciesModule,
    PharmacyProductsModule,
    ConsultationModule,
    DoctorsModule,
    AppointmentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}