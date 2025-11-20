import {
  Injectable,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../config/supabase.config';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(
    private configService: ConfigService,
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');

    try {
      const jwtSecret = this.configService.get<string>('SUPABASE_JWT_SECRET');
      if (!jwtSecret) {
        throw new Error('JWT secret not configured');
      }

      const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
      const isSuperAdmin = await this.isSuperAdmin(decoded.sub);

      request.user = {
        id: decoded.sub,
        email: decoded.email,
        role: decoded.role,
        isSuperAdmin,
      };

      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private async isSuperAdmin(userId: string): Promise<boolean> {
    if (!userId) {
      return false;
    }

    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('is_super_admin')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Failed to load profile when checking super admin:', error);
        return false;
      }

      return Boolean(data?.is_super_admin);
    } catch (error) {
      console.error('Unexpected error when checking super admin:', error);
      return false;
    }
  }
}
