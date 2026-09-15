import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import type { Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const res = context.switchToHttp().getResponse<Response>();
    return next.handle().pipe(
      map((data: unknown) => {
        // Redirects / raw responses must not be wrapped into the JSON envelope.
        if (res.headersSent || res.getHeader('location')) {
          return data;
        }
        return {
          statusCode: res.statusCode,
          message: 'Success',
          data,
        };
      }),
    );
  }
}
