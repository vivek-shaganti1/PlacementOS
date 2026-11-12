## What and why

<!-- One or two sentences. Link the issue or review item if there is one. -->

## Checklist

- [ ] `npm run build` and `npm run test:unit` pass locally
- [ ] Anything users see was checked in the browser (desktop and phone width, keyboard, reduced motion), or is covered by a Playwright test
- [ ] New behaviour has a test that fails without the change
- [ ] Migration (if any):
  - [ ] It is one transaction and safe to run twice
  - [ ] It has a pgTAP test
  - [ ] It is in the ledger in `docs/ENGINEERING.md`
  - [ ] It was **applied in production before merging**
- [ ] No secrets, real student data or `src/dev` files in the diff
- [ ] `CHANGELOG.md` has a line under "Unreleased"
