import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../config/supabase.config';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ManagersService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    private readonly auditService: AuditService,
  ) {}

  async getJamManagers(jamId: string, userId: string, isSuperAdmin = false) {
    // Check if the user is the owner or an existing manager of the jam
    const { data: jam, error: jamError } = await this.supabase
      .from('jams')
      .select('owner_id')
      .eq('id', jamId)
      .single();

    if (jamError || !jam) {
      throw new NotFoundException('Jam not found');
    }

    const isOwner = jam.owner_id === userId;

    if (!isSuperAdmin) {
      const { data: existingManager, error: managerError } = await this.supabase
        .from('jam_managers')
        .select('user_id')
        .eq('jam_id', jamId)
        .eq('user_id', userId)
        .maybeSingle();

      if (!isOwner && !existingManager) {
        throw new ForbiddenException(
          'You do not have permission to view managers for this jam',
        );
      }
    }

    const { data, error } = await this.supabase
      .from('jam_managers')
      .select(
        `
        id,
        jam_id,
        user_id,
        added_by,
        created_at,
        profiles (
          id,
          first_name,
          last_name,
          email
        )
      `,
      )
      .eq('jam_id', jamId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch jam managers: ${error.message}`);
    }

    return data || [];
  }

  async addJamManager(
    jamId: string,
    ownerId: string,
    managerUserId: string,
    isSuperAdmin = false,
  ) {
    // Check if jam exists and user has permission
    const { data: jam, error: jamError } = await this.supabase
      .from('jams')
      .select('id, owner_id')
      .eq('id', jamId)
      .single();

    if (jamError || !jam) {
      throw new NotFoundException('Jam not found');
    }

    // Check if ownerId is actually the owner of the jam
    if (!isSuperAdmin && jam.owner_id !== ownerId) {
      throw new ForbiddenException('Only the jam owner can add managers');
    }

    if (ownerId === managerUserId) {
      throw new BadRequestException('The owner cannot be added as a manager');
    }

    // Check if managerUserId exists
    const { data: profile, error: profileError } = await this.supabase
      .from('profiles')
      .select('id')
      .eq('id', managerUserId)
      .single();

    if (profileError || !profile) {
      throw new NotFoundException('Manager user not found');
    }

    // Check if already a manager
    const { data: existingManager } = await this.supabase
      .from('jam_managers')
      .select('user_id')
      .eq('jam_id', jamId)
      .eq('user_id', managerUserId)
      .maybeSingle();

    if (existingManager) {
      throw new BadRequestException('User is already a manager for this jam');
    }

    const { data, error } = await this.supabase
      .from('jam_managers')
      .insert({
        jam_id: jamId,
        user_id: managerUserId,
        added_by: ownerId,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add manager: ${error.message}`);
    }

    // Log the action
    await this.auditService.log(jamId, ownerId, 'manager_added', {
      manager_user_id: managerUserId,
    });

    return data;
  }

  async removeJamManager(
    jamId: string,
    ownerId: string,
    managerUserId: string,
    isSuperAdmin = false,
  ) {
    // Check if ownerId is actually the owner of the jam
    const { data: jam, error: jamError } = await this.supabase
      .from('jams')
      .select('owner_id')
      .eq('id', jamId)
      .single();

    if (jamError || !jam) {
      throw new NotFoundException('Jam not found');
    }

    if (!isSuperAdmin && jam.owner_id !== ownerId) {
      throw new ForbiddenException('Only the jam owner can remove managers');
    }

    const { error } = await this.supabase
      .from('jam_managers')
      .delete()
      .eq('jam_id', jamId)
      .eq('user_id', managerUserId);

    if (error) {
      throw new Error(`Failed to remove jam manager: ${error.message}`);
    }

    await this.auditService.log(jamId, ownerId, 'manager_removed', {
      manager_user_id: managerUserId,
    });

    return { message: 'Jam manager removed successfully' };
  }

  async isOwnerOrManager(jamId: string, userId: string): Promise<boolean> {
    const { data, error } = await this.supabase.rpc('is_owner_or_manager', {
      jam_id: jamId,
      user_id: userId,
    });

    if (error) {
      console.error('Error checking owner/manager status:', error);
      return false;
    }

    return data || false;
  }
}
