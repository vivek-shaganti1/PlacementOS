# PlacementIQ mobile app (iOS and Android)

The app lives in `mobile/`. It is built with React Native through Expo (SDK 58) and shares its scoring logic with the
website. It is a separate project with its own `package.json`, so nothing in it can affect the website's build or deploy.

## Layout

```
PlacementIQ/
├── src/                 website (Vite + React)
│   ├── lib/             eligibility, predictions, trust rules, types  ← shared with the app
│   └── data/            company catalogues                            ← shared with the app
├── api/                 server functions (the app calls these too)
├── supabase/            database migrations and tests (one backend for web and app)
└── mobile/              the app
    ├── app.json         name, bundle ids, icons, update policy
    ├── eas.json         build profiles and update channels
    ├── metro.config.js  lets the bundler read ../src
    └── src/
        ├── app/         screens (file-based routes): sign-in, (app)/index, drives, account
        ├── components/  shared UI pieces
        └── lib/
            ├── shared.ts    the list of website files the app imports
            ├── supabase.ts  client with an encrypted session on the device
            ├── auth.tsx     session and profile (same queries as the website)
            ├── api.ts       calls the website's /api functions
            └── config.ts    public URLs and key
```

## What the app does today

Students only, to start:
- Sign in.
- See readiness, expected CTC and the four eligibility stacks.
- See the closest companies, each with its next gap.
- See campus drives with match and deadline.
- Sign out.

Accounts the app sends to the website:
- Placement cells, recruiters and platform admins. Their consoles need two-factor sign-in and wide tables.
- Accounts still on a temporary password.

Everything else (editing a profile, resume upload, applying) links to the website for now.

## One copy of the rules

`mobile/src/lib/shared.ts` imports the website's own files (`@shared/…` points at `../src`). A change to a scoring rule
changes the website, the server and the app together.

Shared files must stay pure: no DOM, no `import.meta`, no npm packages, no web Supabase client. `npm run check:shared` at
the repo root enforces this and runs in CI. Types live in `src/lib/types.ts` for the same reason.

To share another file, add it to `shared.ts` and run the check.

## Working on it

```bash
cd mobile
npm install
npm run typecheck
npx expo start        # then press i (iOS simulator) or a (Android emulator), or scan the QR code with Expo Go
```

By default the app talks to production. To develop against a local stack, copy `.env.example` to `.env.local` and set
`EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from `supabase status`. Only public values go in
`EXPO_PUBLIC_*`; they ship inside the app.

CI (`mobile` job) typechecks, runs `expo-doctor` and bundles for both platforms on every pull request.

## One-time setup before the first store release (owner)

| Step | Where | Notes |
|---|---|---|
| Expo account | expo.dev | Free. Run `npx eas-cli login` and `npx eas-cli init` once in `mobile/`; it writes the project id into `app.json`. Commit that. |
| `EXPO_TOKEN` | expo.dev → Access tokens, then GitHub → Settings → Environments → `mobile-release` | Lets the release workflow act for you. Limit the environment to `main`. |
| Apple Developer Program | developer.apple.com | US$99 a year. Needed for TestFlight and the App Store. |
| Google Play Console | play.google.com/console | US$25 once. New personal accounts must run a closed test with 12 testers for 14 days before going public. |
| Bundle ids | `mobile/app.json` | `com.placementiq.app` for both. **Permanent once published**; change it now if you want your own domain in it. |
| Store listing | App Store Connect and Play Console | Screenshots, description, privacy answers (the app collects email and profile data and links to `/privacy`), and a test student login for the reviewers. |

## Releasing

Everything runs from GitHub → Actions → **Mobile release** → Run workflow.

| You changed | Choose | What happens | How long |
|---|---|---|---|
| Only JavaScript or TypeScript (screens, logic, text) | `update`, channel `preview` then `production` | Installed apps download the change at next launch. No store review. | Minutes |
| Native things (a new Expo package with native code, icons, permissions, SDK upgrade, `app.json` plugins) | `build`, then `submit` | A new binary is built in the cloud and sent to the stores for review. | Hours to days |

Rules that keep updates safe:
- **Versions:** an over-the-air update only reaches builds with the same app version (`runtimeVersion` follows `version`
  in `app.json`). When a change needs a new build, bump `version` first, so old binaries never receive code they cannot run.
- **Channels:** `preview` builds go to testers, `production` builds go to the stores. Send an update to `preview`, check it
  on a phone, then send the same commit to `production`.
- **Rolling back:** republish the previous update with `npx eas-cli update:republish --channel production`.
- **Backend first:** the app and the website use the same database. Apply migrations before releasing app code that
  needs them, exactly as for the website (`docs/ENGINEERING.md`).

## Not done yet

- **On-device run:** the sign-in screen was run once in an iOS simulator against a local stack and reached the backend.
  The signed-in screens have not been run on a simulator or device yet.
- **Assets:** the icons and splash screen are still Expo's template placeholders.
- **Features:** no push notifications, no deep links from emails, no in-app resume upload or applying, and no admin roles.
