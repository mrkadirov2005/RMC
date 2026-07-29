import { Module } from '@nestjs/common';
import { DiscountsModule } from '../discounts/discounts.module';
import { PaymentService } from './application/payment.service';
import { PAYMENT_REPOSITORY } from './domain/payment.repository.port';
import { PostgresPaymentRepository } from './infrastructure/postgres-payment.repository';
import { PaymentsController } from './interfaces/payments.controller';

@Module({
  imports: [DiscountsModule],
  controllers: [PaymentsController],
  providers: [
    PaymentService,
    { provide: PAYMENT_REPOSITORY, useClass: PostgresPaymentRepository },
  ],
  exports: [PaymentService],
})
export class PaymentsModule {}
