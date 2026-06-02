import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { RawEvent } from '../entities/raw-event.entity';
import { IdempotencyKey } from '../entities/idempotency-key.entity';
import { CallbackDto, CallbackResponseDto } from '../dto/callback.dto';

@Injectable()
export class PspService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async handleCallback(provider: string, dto: CallbackDto): Promise<CallbackResponseDto> {
    try {
      await this.dataSource.transaction(async (manager) => {
        const idempotencyKey = await manager.save(IdempotencyKey, {
          key: dto.eventId,
          brandId: dto.brandId,
          provider,
        });

        await manager.save(RawEvent, {
          source: 'psp' as const,
          provider,
          brandId: dto.brandId,
          externalEventId: dto.eventId,
          payload: dto.payload,
          status: 'pending' as const,
          idempotencyKeyId: idempotencyKey.id,
        });
      });
    } catch (err: any) {
      if (err?.code === '23505') {
        return { status: 'duplicate', eventId: dto.eventId };
      }
      throw new InternalServerErrorException('Failed to process PSP callback');
    }

    return { status: 'accepted', eventId: dto.eventId };
  }
}
