import { inject, Injectable, NgZone } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

export type AppRole = 'user' | 'admin';

export type Profile = {
  id: string;
  email: string | null;
  role: AppRole;
  created_at: string;
  updated_at: string;
  language_preference?: string;
};

export type InviteRecord = {
  email: string;
  created_at: string;
};

export type Room = {
  id: string;
  name: string;
  name_en: string;
  name_da: string;
  is_default: boolean;
  owner_id: string | null;
  created_at: string;
  updated_at?: string;
};

export type Task = {
  id: string;
  name: string;
  name_en: string;
  name_da: string;
  is_default: boolean;
  owner_id: string | null;
  created_at: string;
  updated_at?: string;
};

export type RepeatUnit = 'day' | 'week' | 'month' | 'quarter' | 'year';
export type RepeatMode = 'every' | 'per';

export type Schedule = {
  id: string;
  owner_id: string;
  task_id: string;
  room_id: string | null;
  start_date: string;
  end_date: string | null;
  repeat_every: number;
  repeat_unit: RepeatUnit;
  repeat_mode: RepeatMode;
  created_at: string;
  updated_at?: string;
};

export type ScheduleWithDetails = Schedule & {
  tasks: { name_en: string; name_da: string } | null;
  rooms: { name_en: string; name_da: string } | null;
};

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;
  private readonly ngZone = inject(NgZone);

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
  }

  async getTasks() {
    const { data, error } = await this.supabase
      .from('cleaning_tasks')
      .select('*');
    
    if (error) {
      console.error('Error fetching tasks:', error);
      return [];
    }
    return data;
  }

  async signIn(email: string, password: string) {
    return await this.supabase.auth.signInWithPassword({ email, password });
  }

  async signUp(email: string, password: string) {
    return await this.supabase.auth.signUp({ email, password });
  }

  async signOut() {
    try {
      const { error } = await this.supabase.auth.signOut();
      if (error) {
        console.error('Sign out error:', error);
      }
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  }

  onAuthStateChange(callback: (event: string) => void) {
    const { data } = this.supabase.auth.onAuthStateChange((event) => {
      this.ngZone.run(() => callback(event));
    });
    return data.subscription;
  }

  getUser() {
    return this.supabase.auth.getUser();
  }

  async isAuthenticated() {
    const { data } = await this.supabase.auth.getSession();
    return !!data.session;
  }

  async getMyProfile() {
    const userResult = await this.getUser();
    const userId = userResult.data.user?.id;

    if (!userId) {
      return null;
    }

    const withLanguage = await this.supabase
      .from('profiles')
      .select('id, email, role, created_at, updated_at, language_preference')
      .eq('id', userId)
      .single<Profile>();

    if (!withLanguage.error) {
      return withLanguage.data;
    }

    if (withLanguage.error.code !== '42703') {
      throw withLanguage.error;
    }

    const fallback = await this.supabase
      .from('profiles')
      .select('id, email, role, created_at, updated_at')
      .eq('id', userId)
      .single<Profile>();

    if (fallback.error) {
      throw fallback.error;
    }

    return fallback.data;
  }

  async setUserRole(userId: string, role: AppRole) {
    const { error } = await this.supabase.rpc('set_user_role', {
      target_user_id: userId,
      new_role: role,
    });

    if (error) {
      throw error;
    }
  }

  async listProfiles() {
    const withLanguage = await this.supabase
      .from('profiles')
      .select('id, email, role, created_at, updated_at, language_preference')
      .order('created_at', { ascending: true })
      .returns<Profile[]>();

    if (!withLanguage.error) {
      return withLanguage.data;
    }

    if (withLanguage.error.code !== '42703') {
      throw withLanguage.error;
    }

    const fallback = await this.supabase
      .from('profiles')
      .select('id, email, role, created_at, updated_at')
      .order('created_at', { ascending: true })
      .returns<Profile[]>();

    if (fallback.error) {
      throw fallback.error;
    }

    return fallback.data;
  }

  async setLanguagePreference(language: string) {
    const userResult = await this.getUser();
    const userId = userResult.data.user?.id;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    const { error } = await this.supabase
      .from('profiles')
      .update({ language_preference: language })
      .eq('id', userId);

    if (error && error.code !== '42703') {
      throw error;
    }
  }

  async inviteUser(email: string) {
    const { error } = await this.supabase.rpc('invite_email', {
      target_email: email,
    });

    if (error) {
      throw error;
    }
  }

  async revokeInvite(email: string) {
    const { error } = await this.supabase.rpc('revoke_invite', {
      target_email: email,
    });

    if (error) {
      throw error;
    }
  }

  async listInvites() {
    const { data, error } = await this.supabase.rpc('list_invites').returns<InviteRecord[]>();

    if (error) {
      throw error;
    }

    return Array.isArray(data) ? data : [];
  }

  async listDefaultRooms() {
    const { data, error } = await this.supabase
      .from('rooms')
      .select('id, name, name_en, name_da, is_default, owner_id, created_at, updated_at')
      .eq('is_default', true)
      .order('name_en', { ascending: true })
      .returns<Room[]>();

    if (error) {
      throw error;
    }

    return Array.isArray(data) ? data : [];
  }

  async addDefaultRoom(nameEn: string, nameDa: string) {
    const normalizedEn = nameEn.trim();
    const normalizedDa = nameDa.trim();
    const { error } = await this.supabase
      .from('rooms')
      .insert({
        name: normalizedEn,
        name_en: normalizedEn,
        name_da: normalizedDa,
        is_default: true,
        owner_id: null,
      });

    if (error) {
      throw error;
    }
  }

  async removeDefaultRoom(roomId: string) {
    const { error } = await this.supabase
      .from('rooms')
      .delete()
      .eq('id', roomId)
      .eq('is_default', true);

    if (error) {
      throw error;
    }
  }

  async listDefaultTasks() {
    const { data, error } = await this.supabase
      .from('tasks')
      .select('id, name, name_en, name_da, is_default, owner_id, created_at, updated_at')
      .eq('is_default', true)
      .order('name_en', { ascending: true })
      .returns<Task[]>();

    if (error) {
      throw error;
    }

    return Array.isArray(data) ? data : [];
  }

  async addDefaultTask(nameEn: string, nameDa: string) {
    const normalizedEn = nameEn.trim();
    const normalizedDa = nameDa.trim();

    const { error } = await this.supabase
      .from('tasks')
      .insert({
        name: normalizedEn,
        name_en: normalizedEn,
        name_da: normalizedDa,
        is_default: true,
        owner_id: null,
      });

    if (error) {
      throw error;
    }
  }

  async removeDefaultTask(taskId: string) {
    const { error } = await this.supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('is_default', true);

    if (error) {
      throw error;
    }
  }

  async listVisibleTasks() {
    const { data, error } = await this.supabase
      .from('tasks')
      .select('id, name, name_en, name_da, is_default, owner_id, created_at, updated_at')
      .order('is_default', { ascending: false })
      .order('name_en', { ascending: true })
      .returns<Task[]>();

    if (error) {
      throw error;
    }

    return Array.isArray(data) ? data : [];
  }

  async addUserTask(nameEn: string, nameDa: string) {
    const normalizedEn = nameEn.trim();
    const normalizedDa = nameDa.trim();
    const userResult = await this.getUser();
    const userId = userResult.data.user?.id;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    const { error } = await this.supabase
      .from('tasks')
      .insert({
        name: normalizedEn,
        name_en: normalizedEn,
        name_da: normalizedDa,
        is_default: false,
        owner_id: userId,
      });

    if (error) {
      throw error;
    }
  }

  async removeUserTask(taskId: string) {
    const { error } = await this.supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('is_default', false);

    if (error) {
      throw error;
    }
  }

  async listVisibleRooms() {
    const { data, error } = await this.supabase
      .from('rooms')
      .select('id, name, name_en, name_da, is_default, owner_id, created_at, updated_at')
      .order('is_default', { ascending: false })
      .order('name_en', { ascending: true })
      .returns<Room[]>();

    if (error) {
      throw error;
    }

    return Array.isArray(data) ? data : [];
  }

  async addUserRoom(nameEn: string, nameDa: string) {
    const normalizedEn = nameEn.trim();
    const normalizedDa = nameDa.trim();
    const userResult = await this.getUser();
    const userId = userResult.data.user?.id;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    const { error } = await this.supabase
      .from('rooms')
      .insert({
        name: normalizedEn,
        name_en: normalizedEn,
        name_da: normalizedDa,
        is_default: false,
        owner_id: userId,
      });

    if (error) {
      throw error;
    }
  }

  async removeUserRoom(roomId: string) {
    const { error } = await this.supabase
      .from('rooms')
      .delete()
      .eq('id', roomId)
      .eq('is_default', false);

    if (error) {
      throw error;
    }
  }

  // ── Schedules ──

  async listSchedules(): Promise<ScheduleWithDetails[]> {
    const { data, error } = await this.supabase
      .from('schedules')
      .select('*, tasks(name_en, name_da), rooms(name_en, name_da)')
      .order('start_date', { ascending: true })
      .returns<ScheduleWithDetails[]>();

    if (error) {
      throw error;
    }

    return Array.isArray(data) ? data : [];
  }

  async addSchedule(taskId: string, roomId: string | null, startDate: string, endDate: string | null, repeatEvery: number, repeatUnit: RepeatUnit, repeatMode: RepeatMode) {
    const userResult = await this.getUser();
    const userId = userResult.data.user?.id;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    const { error } = await this.supabase
      .from('schedules')
      .insert({
        owner_id: userId,
        task_id: taskId,
        room_id: roomId || null,
        start_date: startDate,
        end_date: endDate || null,
        repeat_every: repeatEvery,
        repeat_unit: repeatUnit,
        repeat_mode: repeatMode,
      });

    if (error) {
      throw error;
    }
  }

  async removeSchedule(scheduleId: string) {
    const { error } = await this.supabase
      .from('schedules')
      .delete()
      .eq('id', scheduleId);

    if (error) {
      throw error;
    }
  }
}