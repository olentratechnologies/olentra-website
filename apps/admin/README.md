# Company workspace (`apps/admin`)

The Olentra company workspace (admin panel), as a Next.js App Router application
(`@olentra/admin`). It is deployed separately from the public website in
[`../web`](../web/README.md) and serves only `/dashboard/**` and the
website-controls API (`/api/site-features` and its `stream`).

```sh
npm run dev:admin      # http://localhost:3002/dashboard
npm run build:admin
npm run test:admin     # workspace tests plus @olentra/site-features tests
```

Copy `.env.example` to `.env.local`. `NEXT_PUBLIC_SITE_URL` is the website
origin used for "View website" and preview links. Feature switches are written
to the shared `.data/site-features.json` at the repository root, the same file
the website reads (override with `OLENTRA_FEATURE_STORE_PATH` in both apps).

Both dashboards use MongoDB staff accounts from `backend/realtime-server`.
Set `NEXT_PUBLIC_INTERNSHIP_BACKEND_URL` to its browser-facing origin. Set
`INTERNSHIP_BACKEND_URL` only when the admin server needs a different private
address. Add the workspace origin to `REALTIME_ALLOWED_ORIGINS` and set
`INTERNSHIP_WORKSPACE_ORIGIN` on the realtime service for password-reset emails.

Staff admins receive Owner access. Other staff roles need a `workspace.*`
permission assigned through the internship dashboard's **Staff & roles** page.
Website-switch writes verify the staff token against the account service and
require an admin or `workspace.administrator` permission.

Most workspace content and workflows remain browser-local fixtures, as described
in [`docs/admin-dashboard-data.md`](../../docs/admin-dashboard-data.md).

## Locked out? Recovery

Use **Forgot password?** at `/dashboard/login`; reset links work once and expire
after one hour. Staff passwords require at least 12 characters. Another admin
can reset your password through **Internship dashboard → Staff & roles**.
Keep a second admin with a separate email for this recovery path.

An operator with database access can create or recover an admin from the repo:

```sh
npm run internship:admin -- create --email admin@olentratechnologies.com --name "Olentra Admin"
npm run internship:admin -- reset --email admin@olentratechnologies.com
npm run internship:admin -- list
```

`create` emails a set-password link. `reset` re-enables the staff account,
restores admin access, revokes sessions and emails a fresh link. When email is
unavailable, append `--print-link` and open the printed link privately. Run these
commands with the same database, JWT secret and workspace origin as the service.
