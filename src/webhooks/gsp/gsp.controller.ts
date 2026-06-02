import { Body, Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { GspService } from './gsp.service';
import { CallbackDto, CallbackResponseDto } from '../dto/callback.dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('webhooks')
@Controller('webhooks/gsp')
export class GspController {
  constructor(private readonly gspService: GspService) {}

  @Public()
  @Post(':provider')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive a GSP game-state callback' })
  @ApiParam({ name: 'provider', example: 'evolution' })
  handleCallback(
    @Param('provider') provider: string,
    @Body() dto: CallbackDto,
  ): Promise<CallbackResponseDto> {
    return this.gspService.handleCallback(provider, dto);
  }
}
