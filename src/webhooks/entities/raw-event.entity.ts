import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { IdempotencyKey } from './idempotency-key.entity';

export type EventSource = 'psp' | 'gsp';
export type EventStatus = 'pending' | 'processed' | 'failed';

@Entity('raw_events')
@Index(['brandId', 'provider', 'externalEventId'], { unique: true })
export class RawEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  source: EventSource;

  @Column()
  provider: string;

  @Column()
  brandId: string;

  @Column()
  externalEventId: string;

  @Column({ type: 'jsonb' })
  payload: Record<string, unknown>;

  @Column({ type: 'varchar', default: 'pending' })
  status: EventStatus;

  @Column({ nullable: true, type: 'text' })
  errorMessage?: string;

  @Column()
  idempotencyKeyId: string;

  @OneToOne(() => IdempotencyKey, (key) => key.rawEvent)
  @JoinColumn({ name: 'idempotencyKeyId' })
  idempotencyKey: IdempotencyKey;

  @CreateDateColumn()
  createdAt: Date;
}
