import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

export const adminGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const supabaseService = inject(SupabaseService);

  const authenticated = await supabaseService.isAuthenticated();
  if (!authenticated) {
    return router.createUrlTree(['/login']);
  }

  const profile = await supabaseService.getMyProfile();
  if (profile?.role === 'admin') {
    return true;
  }

  return router.createUrlTree(['/dashboard']);
};
