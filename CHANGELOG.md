# Changelog

## [0.1.0](https://github.com/malhashemi/opencode-sessions/compare/v0.0.10...v0.1.0) (2025-10-29)


### Features

* re-add comprehensive logging to diagnose compaction issues ([fdb8ae9](https://github.com/malhashemi/opencode-sessions/commit/fdb8ae946f83f4a360350b4530d6896f155de69a))

## [0.0.10](https://github.com/malhashemi/opencode-sessions/compare/v0.0.9...v0.0.10) (2025-10-29)


### Bug Fixes

* pass providerID and modelID to session.summarize for successful compaction ([610b997](https://github.com/malhashemi/opencode-sessions/commit/610b997eb505deb73f02de7eec65a755ae31987a))

## [0.0.9](https://github.com/malhashemi/opencode-sessions/compare/v0.0.8...v0.0.9) (2025-10-29)


### Features

* add agent descriptions and compact mode logging ([75166c4](https://github.com/malhashemi/opencode-sessions/commit/75166c413f5ecaafb71d693dcc98e96edb08ab44))

## [0.0.8](https://github.com/malhashemi/opencode-sessions/compare/0.0.7...v0.0.8) (2025-10-29)


### Bug Fixes

* use session.summarize() API instead of TUI command for compaction ([d6faf99](https://github.com/malhashemi/opencode-sessions/commit/d6faf99da6bcf08a6a44796966d72af5dc92c61a))

## [0.0.7](https://github.com/malhashemi/opencode-sessions/compare/v0.0.6...v0.0.7) (2025-10-29)


### Features

* add context injection to compact mode and remove context mode ([e4b76ae](https://github.com/malhashemi/opencode-sessions/commit/e4b76aeeb070ef591b5535f6e63277cccd800542))
* enable agent switching for compact mode ([24dde8a](https://github.com/malhashemi/opencode-sessions/commit/24dde8a84efe15d73e3cbcb214ccd34286519860))

## [0.0.6](https://github.com/malhashemi/opencode-sessions/compare/v0.0.5...v0.0.6) (2025-10-28)


### Features

* implement session.idle pattern for reliable agent switching ([192fd09](https://github.com/malhashemi/opencode-sessions/commit/192fd092f5dc781d9959a0f38dfb42febe96d737))

## [0.0.5](https://github.com/malhashemi/opencode-sessions/compare/v0.0.4...v0.0.5) (2025-10-27)


### Bug Fixes

* resolve deadlock in message/compact modes by not awaiting session.prompt ([edeebdd](https://github.com/malhashemi/opencode-sessions/commit/edeebdd0a224ffaddd3c78a04b7f22bcf8595138))

## [0.0.4](https://github.com/malhashemi/opencode-sessions/compare/v0.0.3...v0.0.4) (2025-10-27)


### Bug Fixes

* use tool hooks to prevent hangs in message and compact modes ([2ff2d46](https://github.com/malhashemi/opencode-sessions/commit/2ff2d46c87b02e37cdb8c002e92b06961ebd9f46))

## [0.0.3](https://github.com/malhashemi/opencode-sessions/compare/v0.0.2...v0.0.3) (2025-10-27)


### Bug Fixes

* discover agents from markdown frontmatter instead of config ([f723f96](https://github.com/malhashemi/opencode-sessions/commit/f723f96621c0568dd989a344d272cd0bc78b2c08))

## [0.0.2](https://github.com/malhashemi/opencode-sessions/compare/v1.0.0...v0.0.2) (2025-10-27)


### Features

* initial implementation of session plugin ([29481a3](https://github.com/malhashemi/opencode-sessions/commit/29481a3ceb40fbd50a059b6e38e63816b1eb0bf8))


### Bug Fixes

* implement file-based agent discovery to prevent startup freeze ([a988850](https://github.com/malhashemi/opencode-sessions/commit/a9888508a7e58c67b43c28a634255309a243ed87))
* remove blocking agent discovery that froze OpenCode on startup ([345d398](https://github.com/malhashemi/opencode-sessions/commit/345d3983080ab8245a0c7d35290825a041aeeaf8))


### Miscellaneous Chores

* release 0.0.1 ([5842777](https://github.com/malhashemi/opencode-sessions/commit/5842777485dab1f14e919448a6a4b0b4544ca90b))
* release 0.0.2 ([138db71](https://github.com/malhashemi/opencode-sessions/commit/138db71333fd5c2f984613418694635c2ae4a6d5))

## 0.0.3 (2025-10-27)


### Bug Fixes

* implement file-based agent discovery to prevent startup freeze ([a988850](https://github.com/malhashemi/opencode-sessions/commit/a9888508a7e58c67b43c28a634255309a243ed87))

## 0.0.2 (2025-10-27)


### Bug Fixes

* remove blocking agent discovery that froze OpenCode on startup ([345d398](https://github.com/malhashemi/opencode-sessions/commit/345d3983080ab8245a0c7d35290825a041aeeaf8))

## 0.0.1 (2025-10-27)


### Features

* initial implementation of session plugin ([29481a3](https://github.com/malhashemi/opencode-sessions/commit/29481a3ceb40fbd50a059b6e38e63816b1eb0bf8))
