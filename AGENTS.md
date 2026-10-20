# AGENTS.md

Entry point for AI coding assistants (Codex, Claude Code, Cursor, Copilot, Qoder …) working on this repository. This is
the fork's onboarding index: what the code is, where it lives, which rules are not negotiable, and how to verify a
change. When this file and a linked document disagree, the linked document wins. Human contributors:
[CONTRIBUTING.md](CONTRIBUTING.md).

## 1. What this checkout is

A non-commercial fan remake of Arknights「卫戍协议：盟约」 that runs in the browser: a Node.js server (rooms, economy,
rounds) and a deterministic battle simulation shared by the server and the browser.

This checkout is **Fuhua-code/Stronghold-Protocol-20**, the 20-player line:

- Base extension: LongQianChen's `feat/IncreasePlayerCapacity` (`d7d541e7`), built on upstream v0.2.6.
- Upstream sync: `sganggs/Stronghold-Protocol` `master` `c9d804f` (package version 0.3.1; the commits call the
  in-progress release 0.3.2, the published release is v0.3.1).
- Integration merge: `abb3c74f` (2026-10-21), 53 conflicting files resolved by hand.
- Default branch: `master` is the 20-player line. `upstream/master` remains the author's line; `lqc/*` is the
  LongQianChen fork. The original `feat/IncreasePlayerCapacity` history is kept.
- Release naming: `v0.3.1-20p.6`. `package.json.version` stays **0.3.1** (stable SemVer) because the external Android
  packager requires `x.y.z`; the APK uses `versionCode` **3002** and package `io.prts.stronghold`.

Two feature worlds coexist and must both keep working:

1. **Upstream 0.3.1**: plugins (cosmetic / data / gameplay / UI / script), content sets and content hosts, the plugin
   studio, skins, official effects/3D board, the new match UI, test rooms, rehearsal, and content hashes (`cs`/`vs`).
2. **This fork**: 20-player capacity, fixed pool groups, parallel group drafts, group item pools, multi-round unite
   voting, announcements, server settings, lobby discovery, match chat, asset pre-cache, compact wire, runtime cache,
   bandwidth emergency, and the 20-player UI.

## 2. Read first

1. [docs/development/README.md](docs/development/README.md), then [DECISIONS.md](docs/development/DECISIONS.md) and
   [UPSTREAM.md](docs/development/UPSTREAM.md). D001–D038 are the fork's approved decisions; they override convenience
   or upstream defaults where they differ. The current merge record is
   [records/2026-10-21-01-upstream-v0.3.1.md](docs/development/records/2026-10-21-01-upstream-v0.3.1.md).
2. [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — the code map, data flow and import boundaries.
3. The rules for the part you touch: [docs/DESIGN.md](docs/DESIGN.md) and `docs/design/`; [docs/PLAYER_CAPACITY.md](docs/PLAYER_CAPACITY.md);
   [docs/ASSET_CACHE.md](docs/ASSET_CACHE.md); [docs/ANNOUNCEMENTS.md](docs/ANNOUNCEMENTS.md);
   [docs/SERVER_SETTINGS.md](docs/SERVER_SETTINGS.md); [docs/WIRE_PROTOCOL.md](docs/WIRE_PROTOCOL.md);
   [docs/HTTP_CACHE.md](docs/HTTP_CACHE.md); upstream references [docs/SIM.md](docs/SIM.md), [docs/META.md](docs/META.md),
   [docs/DATA.md](docs/DATA.md), [docs/I18N.md](docs/I18N.md), [docs/PLUGINS.md](docs/PLUGINS.md),
   [docs/SKINS.md](docs/SKINS.md).

The 20-player rules that are easiest to break:

- **D001** rooms hold 4 / 8 / 10 / 16 / 20, default 8; empty seats and up to 2 spectators never count.
- **D010/D012** fixed pool groups by seat order (3/4/5-player groups); every group drafts in parallel with its own six
  cards, 50 s strategy turns, 30 s first / 16 s later 机变 turns; cross-group repeats are legal.
- **D013** unite rounds are capped by the fixed group count (≤ 5), with per-round majority voting.
- **D009/D036** leader pools scale with living players; pairings are seeded and stay stable from prep to battle.
- **D028** each player's private 自选 stock stays 8 / 5 in every mode; upstream 0.3.0's co-op doubling (#650) is not
  applied to it, although the shared operator pools still double.
- **D029/D034/D035** item stock is per fixed group (five-player groups expand); displayed operator cards/offers may
  debt the group, but equipment purchases and rewards keep their stock check (no equipment debt), and AI avoidance only
  considers the same group's living teammates.
- **D016/D025/D031/D038** asset cache is explicit and hash-addressed; never add an automatic full-catalog download,
  never delete a player's cache as a repair step, and keep the old-directory update cooldown at 5 s/IP.
- **D014/D015** announcements are ordinary vs. urgent notices; images are read-only from the announcement store.
- **D017/D032** lobby discovery is opt-in, paginated and capacity-aware; matchmaking is the host's toggle.
- **D023** a solo seat may reconnect for 2 hours; co-op 10 minutes; waiting-room 60 seconds.
- **D030** bandwidth emergency defaults off; when triggered it protects running matches, blocks new HTTP/identities,
  freezes clocks/timers, and retries every 60 seconds. Do not turn it into an automatic sampler.
- **D037** the player package carries this fork's docs and their tracked reference closure.

## 3. Source map (start at the real file)

| Area | Start here | Notes |
|---|---|---|
| Process entry | `server/index.js` | `startServer()` wires content hash → plugin registry → visual/content sets → match hosts → `Lobby` → static handler → asset cache → announcements/settings → bandwidth emergency → HTTP/WS. Keep this order: rooms and the static handler consume the content/visual sets. |
| Rooms & lobby | `server/lobby.js` (`Room`, `Lobby`) | seats/capacity, host/AI/spectator lifecycle, test rooms, plugin and content-set choice, the per-room message queue (`serial`), `onMessage` → `handleMessage`. Discovery lives in `server/lobbyDiscovery.js`; chat in `server/matchChat.js`. |
| Match | `server/match/Match.js` + `server/match/match/` | the class constructor is in `Match.js`; methods are installed from `phases.js`, `intents.js`, `spDraft.js`, `unitePhase.js`, `bossRounds.js`, `settle.js`, `views.js`, `clientCombat.js`, `reports.js`, `rehearsal.js`, `host/proxy.js`. |
| Player | `server/match/PlayerState.js` + `server/match/player/` | `economy.js` (shop/refresh/price), `acquire.js` (gains/merges/debt), `prep.js`, `pieces.js`, `items.js`, `diy.js`, `views.js`. |
| Pools/capacity | `server/match/pool.js`, `shared/playerCapacity.js` | `SharedItemPool` carries both `scale` (five-player groups) and `debt` (displayed picks); `createPoolGroups` uses the fixed layouts. |
| Protocol | `shared/protocol.js` | `C2S` validators are the wire contract; the fork and upstream fields are merged (capacity/assetCache/chat/discovery plus plugin offers/test rooms/content hashes). `shared/wireCodec.js` / `wireSchema.js` hold compact wire v1. |
| Deterministic sim | `server/sim/` | plain ESM used by Node and browsers; no Node APIs, wall clock, `Math.random`, or engine-approximated Math (use `detmath.js`). Kits are under `server/sim/content/kits/`. |
| HTTP | `server/http/files.js`, `static.js`, `routes.js`, `websocket.js`, `assetCache.js` | `serveFile`/`serveBuffer` are the fork's signatures (`serveBuffer(req,res,body,opts)`; `Range` applies to GET only, HEAD returns 200 and the full length). `static.js` combines the runtime cache (`runtimeCache.js`) with plugin/content/visual routes and the served manifests. |
| Client entry | `public/js/main.js` | router `title → lobby → room → game`, store/net wiring, announcement/asset-cache/chat hosts. Screens: `public/js/screens/{lobby,room,game}.js`; match UI: `public/js/ui/{choiceOverlay,teamPanel,hud,shopBar}.js`. |
| Battle client | `public/js/battle/runner.js` | `InPageSimHost` / `WorkerSimHost` abstraction (`simHost.js`), `simLoader.js`, `simWorker*.js`; the 20P additions are `rawResult()` and `syncPool(hp, acked, max)`. |
| Asset cache | `server/assetCacheCatalog.js`, `server/http/assetCache.js`, `shared/assetCache.js`, `public/js/assetCache.js`, `public/asset-cache-sw.js` | the fork's manager and upstream's imported-art helpers share `public/js/assetCache.js`; keep both export sets. |
| Announcements/settings | `server/announcements.js`, `server/announcementNotices.js`, `server/serverSettings.js`, `tools/{announcements,server-settings}.mjs` | owner-only CLI data lives in `runtime/` (ignored), never in the player zip. |
| Data & tools | `data/*.json`, `tools/` | data is generated by `tools/build-data.mjs`; never hand-edit. Packaging: `tools/package.mjs`, `package-update.mjs`, `asset-cache-pack.mjs`; Windows: `scripts/make-windows-bundle.mjs`. |
| Plugins/studio | `server/plugins/`, `server/studio/`, `plugins/`, `packs/`, `schemas/` | upstream 0.3.x. A server's plugins and `plugins/config.json` are ignored/private; only the readmes, templates and schemas are tracked. |

## 4. Hard rules

- **Official first.** Rules come from official data/PRTS; mark unresolved details `[ASSUMED]`. Deliberate deviations
  need a maintainer decision.
- **Determinism and golden.** Do not change `test/golden/*.json` in a refactor. A gameplay change runs
  `npm run golden:update` in the same commit, names the moved scenarios and why, and updates `docs/design/` +
  `docs/history/`.
- **Generated data.** Change `tools/build-data.mjs`, regenerate, and commit the data; never hand-edit `data/*.json`.
- **No game art in git.** `public/assets/`, `public/fonts/`, `public/vendor/`, `node_modules/`, `.cache/`, `runtime/`,
  player-installed plugins and build outputs are ignored. Never commit downloaded/extracted art, keys or machine paths.
- **i18n.** UI strings go through `t('…')` and exist in every pack under `public/i18n/`; run
  `node tools/i18n.mjs check --all --strict`.
- **Docs follow code.** Update the design/history/reference docs and run
  `node --test test/docs-consistency.test.js test/docs-paths.test.js`.
- **Upstream merges use the decision checklist.** Never resolve a conflict with a whole-file ours/theirs. Record
  “upstream changed / we need / final combination / verification” for each real trade-off. The procedure is in
  [docs/development/UPSTREAM.md](docs/development/UPSTREAM.md).
- **Commits/PRs:** one topic, a one-line message with the issue/topic, no attribution trailers. No monetisation.
- **Reference checkouts outside this workspace are read-only.** Copy inputs; never write into them.

## 5. Verify

```bash
npm ci                                  # postinstall runs tools/vendor.mjs
npm start                               # http://localhost:3000/healthz
node --test test/<area>/<file>.test.js  # targeted first
npm test                                # every Node suite
npm run ci                              # npm test + smoke + lint + imports + typecheck (tools/ci.mjs)
npm run lint                            # warnings allowed, errors fail
npm run check:imports
npm run typecheck
npm run golden                          # full golden digests
node tools/i18n.mjs check --all --strict
node --test test/docs-consistency.test.js test/docs-paths.test.js
```

Browser/E2E suites are opt-in and need Chrome and, for some, downloaded art: `SP_E2E=1`, `SP_REAL_E2E=1`,
`RENDER_E2E=1`, `SIM_E2E=1`. The CI job sets them to `0`.

For the 20P extension, the high-value suites are `test/match/runner.test.js`, `test/match/` (pools, drafts, unite,
settle), `test/ui/` (lobby discovery, announcements, asset cache, group drafts, team panel, chat), `test/asset-index.test.js`,
`test/announcement-assets-http.test.js`, `test/emergency-network.test.js`, and `test/client-static.test.js`.

## 6. Release and Android tasks

The integrated player package (upstream style):

```bash
npm run package -- --dry-run --list     # inspect
npm run package -- --out dist           # full zip
npm run package:lite -- --out dist      # lite zip
npm run assets:pack -- --out dist       # asset-cache zip (+ --catalog-only for JSON)
```

Windows portable package (Node runtime + production deps + art):

```bash
node scripts/make-windows-bundle.mjs --out <empty-dir> --force
```

The Android packager is a separate tool and is **not** committed here. It reads a clean `master` worktree, the complete
v0.3.1 art directory, a JDK/SDK toolchain, and the debug keystore; outputs and caches stay outside the repository.
Build with `connect` and `arm64-v8a,x86_64`; pass `--version-code 3002`; require `status=success` in
`build-report.json` and every `checks[].ok` in `apk-verify.json`. Its overlay anchors target upstream 0.3.1; adapt them
in the packager copy if a 20P UI edit moves an anchor, and re-run the full build. Never edit the reference toolchain or
complete-art directories in place.

## 7. Current merge state and known limits

- Merge baseline: `abb3c74f`; upstream `c9d804f`; package 0.3.1; release tag `v0.3.1-20p.6`; APK `versionCode 3002`.
- The merge record lists every conflict category and the post-merge fixes (HEAD ranges, `rawResult`/`yield`, `syncPool`
  max, runtime URLs in `simLoader`, `slotOf`, unite credited kills, stylesheet order, package counts).
- Full `npm test` (2026-10-21): 9,395 tests — 9,304 pass, 10 fail, 81 skipped. The 10 are load-sensitive timing tests
  (wire-pressure, heavy-field performance, script-sandbox / probe timeouts); each passes when run alone. 17 Windows
  symlink tests skip when Developer Mode is off. `npm run lint` reports 0 errors (537 upstream warnings); `npm run
  typecheck`, `npm run check:imports`, i18n strict and the docs tests pass.
- Forge imports use a directory junction for their validation view on Windows, so they work without Developer Mode;
  the security tests that must create real symlinks skip there.
- Not verified here: 20 real players across devices/NAT, the complete official-UI manual pass, and installing the APK
  on a physical phone/emulator. Do not claim those; use the record's checklist.
- Local artifacts are evidence, not a deployment. Do not create a GitHub Release, deploy, or push a player package
  without the current task's explicit authorization.
