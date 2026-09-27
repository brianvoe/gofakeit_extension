# Changelog

All notable changes to the Gofakeit browser extension are documented in this
file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0]

### Added

- Debug setting in the options modal. When enabled, the extension logs how each
  field was resolved (chosen function, resolution source, score, and reasons) to
  the page console.

### Fixed

- Email fields are no longer filled with a full email message. An
  `<input type="email">` whose label or name mentioned "body" or "message"
  could be resolved to the `email_text` generator and filled with a
  `Subject: ...` message instead of an address. `tel`, `url`, and `password`
  fields had the same class of problem. This is fixed by upgrading to
  `gofakeit@2.5.0`, which resolves these input types deterministically and
  rejects weak fuzzy matches.
- Text fields such as `subject` and `message` no longer resolve to unrelated
  generators (for example a pronoun or an email body).
- The selection-mode pulsing cursor animation now actually runs. The
  `@keyframes` rule was nested inside a selector, which is invalid CSS and was
  silently ignored by browsers (and rejected by the newer build toolchain).

### Changed

- Upgraded `gofakeit` from `^2.3.0` to `^2.5.0`.
- Autofill settings are built in a single place, so the defaults and the
  storage-backed values can no longer drift apart.
- Firefox manifest now declares
  `browser_specific_settings.gecko.data_collection_permissions` (`none`), as
  required for new Firefox extensions.
- Updated build tooling; `npm run type-check` (`tsc --noEmit`) now passes.

### Removed

- Temporary `GofakeitAutofill` subclass workaround, no longer needed now that
  the fix lives in the published library.

## [1.0.1]

Previous release.
