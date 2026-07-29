using CrystalGate.Data;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var connectionString = builder.Configuration.GetConnectionString("Default") ?? "Data Source=crystalgate.db";
builder.Services.AddDbContext<CrystalGateDbContext>(opt => opt.UseSqlite(connectionString));

// Permissive CORS — the client is a static game page (browser or a Capacitor
// WebView with a file:// / custom origin), so we can't allowlist a single
// known origin the way a normal web app would. Tighten this to specific
// origins once the game has a real published domain.
builder.Services.AddCors(opt =>
{
    opt.AddDefaultPolicy(policy => policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
});

var app = builder.Build();

// Auto-create the SQLite schema on startup. This is a lightweight stand-in
// for EF Core migrations, appropriate for this scaffold-stage project — once
// the schema needs to evolve without wiping data, switch to
// `dotnet ef migrations add ...` + `Database.Migrate()` instead.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<CrystalGateDbContext>();
    db.Database.EnsureCreated();
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();

static PlayerDto ToDto(Player p) => new(p.Id, p.Name, p.Email, p.RecoveryCode, p.Coins, p.PowerLevel, p.SpeedLevel, p.FireRateLevel, p.CurrentStage);

// Human-typeable recovery code: 8 chars from an unambiguous charset (no
// 0/O/1/I/L) so a player can read it off one phone and type it into another.
// Formatted like "ABCD-EFGH" for readability.
static string GenerateRecoveryCode()
{
    const string chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    var buf = new char[8];
    for (var i = 0; i < buf.Length; i++) buf[i] = chars[Random.Shared.Next(chars.Length)];
    return $"{new string(buf, 0, 4)}-{new string(buf, 4, 4)}";
}

static async Task<string> GenerateUniqueRecoveryCode(CrystalGateDbContext db)
{
    string code;
    do { code = GenerateRecoveryCode(); }
    while (await db.Players.AnyAsync(p => p.RecoveryCode == code));
    return code;
}

// ---- Player registration / sync --------------------------------------
// The mobile client calls this once with a locally-generated DeviceId; the
// server either creates a new Player row or finds the existing one, so the
// same device always maps back to the same Player across app restarts.
// Email is optional (just for the player's own reference — we never send
// mail to it yet); the RecoveryCode is what actually lets someone reclaim
// their account+progress on a new phone via /api/players/recover.
app.MapPost("/api/players/register", async (RegisterRequest req, CrystalGateDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(req.DeviceId)) return Results.BadRequest("DeviceId is required.");

    var player = await db.Players.FirstOrDefaultAsync(p => p.DeviceId == req.DeviceId);
    if (player is null)
    {
        player = new Player
        {
            DeviceId = req.DeviceId,
            Name = string.IsNullOrWhiteSpace(req.Name) ? "Guardian" : req.Name!.Trim().Substring(0, Math.Min(14, req.Name!.Trim().Length)),
            Email = string.IsNullOrWhiteSpace(req.Email) ? null : req.Email!.Trim(),
            RecoveryCode = await GenerateUniqueRecoveryCode(db),
        };
        db.Players.Add(player);
    }
    else
    {
        player.LastSeenAt = DateTime.UtcNow;
        if (!string.IsNullOrWhiteSpace(req.Name)) player.Name = req.Name!.Trim().Substring(0, Math.Min(14, req.Name!.Trim().Length));
        if (!string.IsNullOrWhiteSpace(req.Email)) player.Email = req.Email!.Trim();
    }
    await db.SaveChangesAsync();
    return Results.Ok(ToDto(player));
})
.WithName("RegisterPlayer")
.WithOpenApi();

// Push the client's local save state (coins, upgrade levels, name) up to the
// server so the leaderboard/admin panel reflect the player's real progress.
app.MapPut("/api/players/{id:int}/sync", async (int id, SyncRequest req, CrystalGateDbContext db) =>
{
    var player = await db.Players.FindAsync(id);
    if (player is null) return Results.NotFound();
    if (player.IsBanned) return Results.Forbid();

    if (!string.IsNullOrWhiteSpace(req.Name)) player.Name = req.Name!.Trim().Substring(0, Math.Min(14, req.Name!.Trim().Length));
    if (req.Email is not null) player.Email = string.IsNullOrWhiteSpace(req.Email) ? null : req.Email.Trim();
    if (req.Coins is int c) player.Coins = c;
    if (req.PowerLevel is int pl) player.PowerLevel = pl;         // "strength" upgrade level
    if (req.SpeedLevel is int sl) player.SpeedLevel = sl;
    if (req.FireRateLevel is int fl) player.FireRateLevel = fl;
    if (req.CurrentStage is int st) player.CurrentStage = Math.Max(1, st);
    player.LastSeenAt = DateTime.UtcNow;

    await db.SaveChangesAsync();
    return Results.Ok(ToDto(player));
})
.WithName("SyncPlayer")
.WithOpenApi();

// Fetch a player's current saved state directly — useful for the client to
// confirm what's actually stored server-side (coins, strength/speed/haste
// levels, current stage, best score) after a sync, or on app relaunch.
app.MapGet("/api/players/{id:int}", async (int id, CrystalGateDbContext db) =>
{
    var player = await db.Players.FindAsync(id);
    if (player is null) return Results.NotFound();

    var bestScore = await db.Scores.Where(s => s.PlayerId == id)
        .OrderByDescending(s => s.Score)
        .Select(s => (int?)s.Score)
        .FirstOrDefaultAsync() ?? 0;

    return Results.Ok(new PlayerProfileDto(ToDto(player), bestScore, player.IsBanned));
})
.WithName("GetPlayer")
.WithOpenApi();

// Recover an existing account on a new device/reinstall: the player enters
// the RecoveryCode they were given at registration, plus their new device's
// DeviceId, and we re-point the account at the new device so their coins,
// upgrades, and leaderboard history follow them.
app.MapPost("/api/players/recover", async (RecoverRequest req, CrystalGateDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(req.RecoveryCode)) return Results.BadRequest("RecoveryCode is required.");
    if (string.IsNullOrWhiteSpace(req.DeviceId)) return Results.BadRequest("DeviceId is required.");

    var code = req.RecoveryCode!.Trim().ToUpperInvariant();
    var player = await db.Players.FirstOrDefaultAsync(p => p.RecoveryCode == code);
    if (player is null) return Results.NotFound("No account found for that recovery code.");
    if (player.IsBanned) return Results.Forbid();

    // If this device already registered its own (different) player row —
    // e.g. it played a bit before entering a recovery code — retire that
    // throwaway row so the DeviceId is free to move to the recovered account.
    var existingOnDevice = await db.Players.FirstOrDefaultAsync(p => p.DeviceId == req.DeviceId && p.Id != player.Id);
    if (existingOnDevice is not null) db.Players.Remove(existingOnDevice);

    player.DeviceId = req.DeviceId;
    player.LastSeenAt = DateTime.UtcNow;
    await db.SaveChangesAsync();
    return Results.Ok(ToDto(player));
})
.WithName("RecoverPlayer")
.WithOpenApi();

// ---- Scores / leaderboard --------------------------------------------
app.MapPost("/api/scores", async (ScoreSubmission req, CrystalGateDbContext db) =>
{
    var player = await db.Players.FindAsync(req.PlayerId);
    if (player is null) return Results.NotFound("Unknown PlayerId — call /api/players/register first.");
    if (player.IsBanned) return Results.Forbid();

    var entry = new ScoreEntry { PlayerId = req.PlayerId, Score = req.Score, StageReached = req.StageReached };
    db.Scores.Add(entry);
    await db.SaveChangesAsync();
    // Return a plain DTO, not the tracked entity — serializing `entry.Player`
    // would walk Player.Scores -> ScoreEntry.Player -> ... and blow up with a
    // JSON reference-cycle error.
    return Results.Created($"/api/scores/{entry.Id}", new { entry.Id, entry.PlayerId, entry.Score, entry.StageReached, entry.CreatedAt });
})
.WithName("SubmitScore")
.WithOpenApi();

// Top-N leaderboard: each player's single BEST run, ranked descending,
// excluding banned players. This is what makes it a real "top ranking for
// all players" instead of the client's on-device-only fallback list.
//
// EF Core can't translate "GroupBy + pick best row per group" directly to
// SQL (SubQuery-per-group isn't supported by the Sqlite/relational
// translator). Instead: pull scores ordered best-first (capped to a bounded
// window, not the whole table) and de-duplicate by player in memory, keeping
// only each player's first (i.e. highest) row. Fine at this scale; if the
// scores table gets huge, replace with a raw SQL query or a materialized
// "best score per player" table instead.
app.MapGet("/api/leaderboard/top", async (int count, CrystalGateDbContext db) =>
{
    var n = count <= 0 ? 20 : Math.Min(count, 100);

    var candidates = await db.Scores
        .Include(s => s.Player)
        .Where(s => s.Player != null && !s.Player.IsBanned)
        .OrderByDescending(s => s.Score)
        .Take(n * 10) // wide enough window to find N distinct players even with repeat submitters
        .ToListAsync();

    var seenPlayers = new HashSet<int>();
    var rows = new List<LeaderboardRow>();
    foreach (var s in candidates)
    {
        if (!seenPlayers.Add(s.PlayerId)) continue; // keep only the first (best) row per player
        rows.Add(new LeaderboardRow(rows.Count + 1, s.Player!.Name, s.Score, s.StageReached, s.CreatedAt));
        if (rows.Count >= n) break;
    }
    return Results.Ok(rows);
})
.WithName("GetTopLeaderboard")
.WithOpenApi();

app.MapGet("/api/health", () => Results.Ok(new { status = "ok", time = DateTime.UtcNow }))
.WithName("HealthCheck")
.WithOpenApi();

app.Run();

// ---- DTOs -----------------------------------------------------------
record RegisterRequest(string DeviceId, string? Name, string? Email);
record PlayerDto(int Id, string Name, string? Email, string RecoveryCode, int Coins, int PowerLevel, int SpeedLevel, int FireRateLevel, int CurrentStage);
record PlayerProfileDto(PlayerDto Player, int BestScore, bool IsBanned);
record SyncRequest(string? Name, string? Email, int? Coins, int? PowerLevel, int? SpeedLevel, int? FireRateLevel, int? CurrentStage);
record RecoverRequest(string RecoveryCode, string DeviceId);
record ScoreSubmission(int PlayerId, int Score, int StageReached);
record LeaderboardRow(int Rank, string Name, int Score, int StageReached, DateTime CreatedAt);
