import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProfileService } from './profile.service';
import { ProfileDto } from './dto/profile.dto';
import { ExtractUser } from '../../common/decorators/current-user.decorator';
import { BrandId } from '../../common/decorators/brand-id.decorator';

@ApiTags('profile')
@ApiBearerAuth()
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get the authenticated user profile' })
  getMe(
    @ExtractUser() user: { userId: string },
    @BrandId() brandId: string,
  ): Promise<ProfileDto> {
    return this.profileService.getMe(user.userId, brandId);
  }
}
