import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PspController } from './psp/psp.controller';
import { PspService } from './psp/psp.service';
import { GspController } from './gsp/gsp.controller';
import { GspService } from './gsp/gsp.service';
import { RawEvent } from './entities/raw-event.entity';
import { IdempotencyKey } from './entities/idempotency-key.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RawEvent, IdempotencyKey])],
  controllers: [PspController, GspController],
  providers: [PspService, GspService],
})
export class WebhooksModule {}
