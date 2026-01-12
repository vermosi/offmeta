# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Added
- OSS documentation set (governance, support, architecture, configuration).
- Runtime environment validation and `.env.example`.
- CI workflows for linting, type checking, tests, and builds.
- Expanded deterministic translation tests and env validation tests.
- Request correlation IDs in Edge Function responses.

### Changed
- Improved Scryfall API reliability with timeouts and retries.
- Updated deterministic translation rules for color identity and mana production.

### Fixed
- Removed debug console logs from production paths.
