import { Body, Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { PspService } from './psp.service';
import { CallbackDto, CallbackResponseDto } from '../dto/callback.dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('webhooks')
@Controller('webhooks/psp')
export class PspController {
  constructor(private readonly pspService: PspService) {}

  @Public()
  @Post(':provider')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive a PSP payment callback' })
  @ApiParam({ name: 'provider', example: 'stripe' })
  handleCallback(
    @Param('provider') provider: string,
    @Body() dto: CallbackDto,
  ): Promise<CallbackResponseDto> {
    return this.pspService.handleCallback(provider, dto);
  }
}
