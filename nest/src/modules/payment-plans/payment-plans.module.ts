import { Module } from '@nestjs/common';
import { PaymentPlansService } from './application/payment-plans.service';
import { PAYMENT_PLANS_REPOSITORY } from './domain/payment-plans.repository.port';
import { PostgresPaymentPlansRepository } from './infrastructure/postgres-payment-plans.repository';
import { PaymentPlansController } from './interfaces/payment-plans.controller';

@Module({
  controllers: [PaymentPlansController],
  providers: [
    PaymentPlansService,
    { provide: PAYMENT_PLANS_REPOSITORY, useClass: PostgresPaymentPlansRepository },
  ],
  exports: [PaymentPlansService],
})
export class PaymentPlansModule {}
