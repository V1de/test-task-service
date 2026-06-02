import { IsObject, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CallbackDto {
  @ApiProperty({ description: 'Unique event identifier for idempotency' })
  @IsString()
  eventId: string;

  @ApiProperty({ description: 'Tenant / brand identifier' })
  @IsString()
  brandId: string;

  @ApiProperty({ description: 'Raw event payload from the provider', type: Object })
  @IsObject()
  payload: Record<string, unknown>;
}

export class CallbackResponseDto {
  @ApiProperty({ enum: ['accepted', 'duplicate'] })
  status: 'accepted' | 'duplicate';

  @ApiProperty()
  eventId: string;
}
