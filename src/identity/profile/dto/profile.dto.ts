import { ApiProperty } from '@nestjs/swagger';

export class ProfileDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  brandId: string;

  @ApiProperty({ required: false })
  name?: string;

  @ApiProperty()
  createdAt: Date;
}
