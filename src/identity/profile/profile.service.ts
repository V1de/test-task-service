import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { ProfileDto } from './dto/profile.dto';

@Injectable()
export class ProfileService {
  constructor(@InjectRepository(User) private readonly userRepo: Repository<User>) {}

  async getMe(userId: string, brandId: string): Promise<ProfileDto> {
    const user = await this.userRepo.findOne({
      where: { id: userId, brandId },
    });

    if (!user) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' });
    }

    return {
      id: user.id,
      email: user.email,
      brandId: user.brandId,
      name: user.name,
      createdAt: user.createdAt,
    };
  }
}
