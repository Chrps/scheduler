# CleaningSchedular

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.7.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## GitHub Pages build

This project includes a `Makefile` to build with the correct GitHub Pages base href and verify the SPA 404 fallback file is present.

```bash
make deploy-ready
```

Useful targets:

- `make build-gh-pages` → runs `ng build --base-href /cleaning-schedular/`
- `make verify-404` → checks that `dist/cleaning-schedular/browser/404.html` exists

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

## Supabase migrations (codebase-first)

This project is set up to manage Supabase schema changes from source control using migration files in `supabase/migrations`.

### One-time setup

1. Install dependencies:

```bash
npm install
```

2. Login to Supabase CLI:

```bash
npm run supabase:login
```

3. Set your project ref in the shell and link the project:

```bash
export SUPABASE_PROJECT_REF=your-project-ref
npm run supabase:link
```

### Local development

Start local Supabase (Docker required):

```bash
npm run supabase:start
```

Apply migrations locally:

```bash
npm run migration:up
```

Push migrations to linked remote project:

```bash
npm run migration:up:remote
```

Stop local Supabase:

```bash
npm run supabase:stop
```

### Create and apply a new migration

Create migration:

```bash
npm run migration:new -- add_your_change_name
```

Then edit the generated SQL file in `supabase/migrations/` and run:

```bash
npm run migration:up
```

### Generate TypeScript DB types

```bash
npm run types:db
```

## Auth and admin setup

This app now includes:

- Login / sign-up page at `/login`
- User dashboard at `/dashboard`
- Admin dashboard at `/admin` (guarded)
- Invite-only sign-up (email must be allowlisted)

### First admin setup (you)

1. Start local services:

```bash
npm run supabase:start
```

2. Allowlist your email (direct DB helper):

```bash
make invite-email EMAIL=you@example.com
```

3. Create your account from the app sign-up page (`/login` → `Sign up`).

4. Promote yourself directly in the local DB:

```bash
make make-admin EMAIL=you@example.com
```

5. Log in again and open `/admin`.

### Admin dashboard actions

- List users by email and role
- Invite users by email (allowlist)
- Promote/demote users between `user` and `admin`
