import { Routes } from '@angular/router';
import { adminGuard } from './guards/admin.guard';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
	{
		path: '',
		canActivate: [authGuard],
		loadComponent: () => import('./pages/main-page.component').then((m) => m.MainPageComponent),
	},
	{
		path: 'login',
		loadComponent: () => import('./pages/auth-page.component').then((m) => m.AuthPageComponent),
	},
	{
		path: 'settings',
		canActivate: [authGuard],
		loadComponent: () =>
			import('./pages/user-dashboard.component').then((m) => m.UserDashboardComponent),
	},
	{
		path: 'admin',
		canActivate: [adminGuard],
		loadComponent: () =>
			import('./pages/admin-dashboard.component').then((m) => m.AdminDashboardComponent),
	},
	{
		path: '**',
		redirectTo: '',
	},
];
