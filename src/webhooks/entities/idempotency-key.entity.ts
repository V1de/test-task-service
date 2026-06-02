import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  OneToOne,
} from 'typeorm';
import { RawEvent } from './raw-event.entity';

@Entity('idempotency_keys')
@Index(['brandId', 'provider', 'key'], { unique: true })
export class IdempotencyKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  key: string;

  @Column()
  brandId: string;

  @Column()
  provider: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToOne(() => RawEvent, (rawEvent) => rawEvent.idempotencyKey)
  rawEvent: RawEvent;
}
