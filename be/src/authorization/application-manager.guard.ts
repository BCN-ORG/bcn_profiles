import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { MANAGE_APPLICATION_KEY } from './manage-application.decorator';

@Injectable()
export class ApplicationManagerGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (
      !this.reflector.getAllAndOverride<boolean>(MANAGE_APPLICATION_KEY, [
        context.getHandler(),
        context.getClass(),
      ])
    )
      return true;

    const request = context.switchToHttp().getRequest<{
      user?: { id: string; role: string };
      params: { app?: string };
    }>();
    if (request.user?.role === 'ADMIN') return true;
    const app = request.params.app;
    const manager =
      request.user && app
        ? await this.prisma.applicationManager.findFirst({
            where: {
              userId: request.user.id,
              application: {
                OR: [{ code: app.toUpperCase() }, { clientId: app }],
              },
            },
            select: { userId: true },
          })
        : null;
    if (!manager) {
      throw new ForbiddenException('You do not manage this application');
    }
    return true;
  }
}
