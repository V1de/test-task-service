import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '../identity/entities/user.entity';
import { Session } from '../identity/entities/session.entity';
import { RawEvent } from '../webhooks/entities/raw-event.entity';
import { IdempotencyKey } from '../webhooks/entities/idempotency-key.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get('DB_USER', 'postgres'),
        password: config.get('DB_PASSWORD', 'postgres'),
        database: config.get('DB_NAME', 'psp_gsp_service'),
        entities: [User, Session, RawEvent, IdempotencyKey],
        synchronize: config.get('NODE_ENV') !== 'production',
        dropSchema: config.get('NODE_ENV') === 'test',
      }),
    }),
  ],
})
export class DatabaseModule {}
