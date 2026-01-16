import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';

export interface Response<T> {
  success: boolean;
  data: T;
  timestamp: string;
  path: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  private readonly logger = new Logger(TransformInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    const request = context.switchToHttp().getRequest();
    const now = Date.now();

    return next.handle().pipe(
      tap(() => {
        const responseTime = Date.now() - now;
        this.logger.debug(`${request.method} ${request.url} - ${responseTime}ms`);
      }),
      map(data => ({
        success: true,
        data,
        timestamp: new Date().toISOString(),
        path: request.url,
      })),
    );
  }
}
