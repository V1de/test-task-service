import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();

    const user = req.user;

    if (!user.brandId) {
      throw new ForbiddenException('Missing tenant (brandId) in token');
    }

    return true;
  }
}
