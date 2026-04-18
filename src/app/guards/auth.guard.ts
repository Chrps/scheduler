import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

export const authGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const supabaseService = inject(SupabaseService);

  const authenticated = await supabaseService.isAuthenticated();
  if (authenticated) {
    return true;
  }

  return router.createUrlTree(['/login']);
};
