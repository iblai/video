# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.26] - 2026-10-21

### Security
- Runtime moved to Node 22 (`node:22` build, `node:22-alpine` runner, release workflow on 22.23.4) after the eMudhra/emSign CA incident: Node 20 and 25 never received the trust-store fix, 22.23.4+ rejects the compromised intermediates and ships NSS 3.131.1 roots ([iblai/iblai-platform#2734](https://github.com/iblai/iblai-platform/issues/2734)).
