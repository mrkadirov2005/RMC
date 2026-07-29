import { Module } from '@nestjs/common';
import { DiscountService } from './application/discount.service';
import { DISCOUNT_REPOSITORY } from './domain/discount.repository.port';
import { PostgresDiscountRepository } from './infrastructure/postgres-discount.repository';
import { DiscountsController } from './interfaces/discounts.controller';

@Module({
  controllers: [DiscountsController],
  providers: [
    DiscountService,
    { provide: DISCOUNT_REPOSITORY, useClass: PostgresDiscountRepository },
  ],
  exports: [DiscountService, DISCOUNT_REPOSITORY],
})
export class DiscountsModule {}
