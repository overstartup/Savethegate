# Landgate — Backend

A .NET 8 backend for the Landgate leaderboard/player system: a Web API the
game client talks to, and a Razor Pages admin panel to manage players and
scores. This is what upgrades the game's leaderboard from "top scores on this
one device" to a real "top ranking for all players."

## Projects

- **CrystalGate.Data** — shared EF Core models (`Player`, `ScoreEntry`) and `CrystalGateDbContext`. SQLite by default (zero-config, one file).
- **CrystalGate.Api** — the public Web API the game calls.
- **CrystalGate.Admin** — a password-gated Razor Pages panel to view/rename/ban/delete players and moderate leaderboard entries.

## Running locally

```bash
dotnet restore
dotnet run --project src/CrystalGate.Api    # http://localhost:5080 (Swagger at /swagger in dev)
dotnet run --project src/CrystalGate.Admin  # http://localhost:5090 (login: admin / ChangeMe123!)
```

Both projects point at the same SQLite file via `ConnectionStrings:Default` in
their `appsettings.json` (defaults to `/tmp/crystalgate-data/crystalgate.db` —
change this to a real path, or swap the provider to SQL Server/PostgreSQL,
before deploying anywhere real).

**Change the admin password** (`Admin:Username` / `Admin:Password` in
`CrystalGate.Admin/appsettings.json`) before deploying this anywhere reachable
from the internet. The login is a simple hardcoded-credential cookie check —
fine for an internal tool on a private network, not real security. Swap in
ASP.NET Identity, Azure AD, or similar before exposing this publicly.

## API endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/players/register` | `{ deviceId, name, email? }` → get-or-create a Player by device id, returns the Player (including a `recoveryCode`) |
| POST | `/api/players/recover` | `{ recoveryCode, deviceId }` → reclaim an existing account on a new device/reinstall |
| PUT | `/api/players/{id}/sync` | `{ name?, email?, coins?, powerLevel?, speedLevel?, fireRateLevel?, currentStage? }` → push local save state up (`powerLevel` = "strength") |
| GET | `/api/players/{id}` | Fetch a player's current saved state plus their best score — useful to confirm a sync actually persisted |
| POST | `/api/scores` | `{ playerId, score, stageReached }` → record a finished run's points |
| GET | `/api/leaderboard/top?count=20` | Top N players by their best score (banned players excluded) |
| GET | `/api/health` | Liveness check |

### What's persisted per player

- **Coins** and **points** — coins live on the Player row (`sync`); points are
  each run's score, stored as a `ScoreEntry` via `/api/scores` (every
  submission is kept, not just the best, so play history isn't lost).
- **Strength** (`powerLevel`), **speed** (`speedLevel`), **haste**
  (`fireRateLevel`) — the three permanent upgrade levels, all settable via
  `sync`.
- **Stage** (`currentStage`) — the player's persisted progress marker,
  settable via `sync`, separate from the `stageReached` recorded on each
  individual score submission.

All of the above was verified end-to-end (register → sync coins/strength/
speed/haste/stage → confirm via GET → submit a score → confirm best score
and leaderboard reflect it → recover onto a new device and confirm coins/
strength/stage all carried over).

### Account recovery

Every registered Player gets a server-generated `recoveryCode` (an 8-character
code like `BHJ6-Q5FC`, formatted for easy reading/typing — no ambiguous
characters like `0`/`O`/`1`/`I`). The email address is optional and purely for
the player's own reference — nothing is emailed to it yet, it's just stored.

Show the player their recovery code somewhere in the UI (e.g. the name-entry
or settings screen) and let them save it. If they reinstall the app or switch
phones, they enter that code and their new device's `deviceId` gets re-pointed
at their existing account — same coins, upgrades, and leaderboard history.

## What's NOT done yet (next steps)

1. **The game client doesn't call this yet.** `src/data/save.js` still only
   keeps a local leaderboard. Wiring the client up means: generating/storing
   a `deviceId` on first launch, calling `/api/players/register` once, and
   calling `/api/scores` + `/api/leaderboard/top` instead of (or alongside)
   the local list. That needs a real hosting URL for this API first.
2. **Migrations.** The schema is created via `EnsureCreated()` for simplicity.
   Once the schema needs to change without wiping data, switch to
   `dotnet ef migrations add <Name>` + `Database.Migrate()`.
3. **Hosting.** Nothing here is deployed — this runs locally only. Deploying
   needs a real host (Azure App Service, a VM, a container, etc.), a real
   database (SQLite is fine for one instance; use Postgres/SQL Server if this
   ever runs on more than one machine), and HTTPS.
4. **CORS is wide open** (`AllowAnyOrigin`) since the client currently has no
   fixed origin. Tighten this once the game is served from a real domain.
