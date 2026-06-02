import { Test, TestingModule } from '@nestjs/testing';
import { InternalServerErrorException } from '@nestjs/common';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { PspService } from './psp.service';
import { RawEvent } from '../entities/raw-event.entity';
import { IdempotencyKey } from '../entities/idempotency-key.entity';
import { CallbackDto } from '../dto/callback.dto';

const baseCallback: CallbackDto = {
  eventId: 'evt-123',
  brandId: 'brandA',
  payload: { type: 'payment.success', amount: 5000 },
};

const savedIdempotencyKey: Partial<IdempotencyKey> = {
  id: 'idem-uuid-1',
  key: 'evt-123',
  brandId: 'brandA',
  provider: 'stripe',
};

describe('PspService — callback ingestion', () => {
  let service: PspService;

  const idempotencyRepo = { findOne: jest.fn() };
  const rawEventRepo = {};

  const mockManager = { save: jest.fn() };
  const dataSource = { transaction: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PspService,
        { provide: getRepositoryToken(RawEvent), useValue: rawEventRepo },
        { provide: getRepositoryToken(IdempotencyKey), useValue: idempotencyRepo },
        { provide: getDataSourceToken(), useValue: dataSource },
      ],
    }).compile();

    service = module.get<PspService>(PspService);
    jest.clearAllMocks();

    // Default happy-path transaction: key saved first, then raw event
    dataSource.transaction.mockImplementation(async (cb) => {
      mockManager.save
        .mockResolvedValueOnce(savedIdempotencyKey) // IdempotencyKey insert
        .mockResolvedValueOnce({ id: 'raw-uuid-1' }); // RawEvent insert
      await cb(mockManager);
    });
  });

  describe('new event', () => {
    it('persists idempotency key then raw event, returns "accepted"', async () => {
      const result = await service.handleCallback('stripe', baseCallback);

      expect(result).toEqual({ status: 'accepted', eventId: 'evt-123' });
      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(mockManager.save).toHaveBeenCalledTimes(2);
    });

    it('saves idempotency key before raw event (key is the guard)', async () => {
      await service.handleCallback('stripe', baseCallback);

      const firstSaveArg = mockManager.save.mock.calls[0][1];
      expect(firstSaveArg.key).toBe('evt-123');
      expect(firstSaveArg.provider).toBe('stripe');
      expect(firstSaveArg.brandId).toBe('brandA');
    });

    it('links raw event to idempotency key via FK', async () => {
      await service.handleCallback('stripe', baseCallback);

      const rawEventArg = mockManager.save.mock.calls[1][1];
      expect(rawEventArg.idempotencyKeyId).toBe('idem-uuid-1');
      expect(rawEventArg.source).toBe('psp');
      expect(rawEventArg.provider).toBe('stripe');
      expect(rawEventArg.externalEventId).toBe('evt-123');
    });
  });

  describe('idempotency', () => {
    it('returns "duplicate" on unique constraint violation (concurrent requests)', async () => {
      const pgUniqueViolation = Object.assign(new Error('duplicate key'), { code: '23505' });
      dataSource.transaction.mockRejectedValue(pgUniqueViolation);

      const result = await service.handleCallback('stripe', baseCallback);

      expect(result).toEqual({ status: 'duplicate', eventId: 'evt-123' });
    });

    it('re-throws unexpected DB errors as InternalServerErrorException', async () => {
      dataSource.transaction.mockRejectedValue(new Error('connection refused'));

      await expect(service.handleCallback('stripe', baseCallback)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
