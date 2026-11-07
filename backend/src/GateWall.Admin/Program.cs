using GateWall.Data;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;
using Pomelo.EntityFrameworkCore.MySql.Infrastructure;
using Google.Apis.AndroidPublisher.v3;
using Google.Apis.Auth.OAuth2;
using Google.Apis.Services;
using System.Text.Json.Nodes;
var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddRazorPages();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddHttpClient();

var connectionString = builder.Configuration.GetConnectionString("Default");
if (string.IsNullOrWhiteSpace(connectionString))
    throw new InvalidOperationException("ConnectionStrings:Default is not set (use the ConnectionStrings__Default env var).");
builder.Services.AddDbContext<GateWallDbContext>(opt =>
    opt.UseMySql(connectionString, new MySqlServerVersion(new Version(8, 0, 36))));

// Permissive CORS for the game client
builder.Services.AddCors(opt =>
{
    opt.AddDefaultPolicy(policy => policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
});

// Minimal cookie-auth login gate for the Admin panel
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.LoginPath = "/Login";
        options.AccessDeniedPath = "/Login";
        options.ExpireTimeSpan = TimeSpan.FromHours(8);
    });
builder.Services.AddAuthorization(options =>
{
    options.FallbackPolicy = options.DefaultPolicy; // require auth everywhere except pages marked [AllowAnonymous]
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<GateWallDbContext>();
    // No EF migration history for the MySQL provider yet (backend moved off
    // SQLite for the Coolify/shared-MySQL deploy) — EnsureCreated builds the
    // schema straight from the current model, including the HasData seed.
    db.Database.EnsureCreated();
    // EnsureCreated doesn't add tables to an existing database, so tables
    // added after the first deploy are created here (no-op once they exist).
    db.Database.ExecuteSqlRaw(@"CREATE TABLE IF NOT EXISTS InviteClaims (
        Id int NOT NULL AUTO_INCREMENT PRIMARY KEY,
        InviterId int NOT NULL,
        InviteeId int NOT NULL,
        InviterPaid tinyint(1) NOT NULL DEFAULT 0,
        CreatedAt datetime(6) NOT NULL,
        UNIQUE KEY IX_InviteClaims_InviteeId (InviteeId),
        KEY IX_InviteClaims_InviterId (InviterId))");
    db.Database.ExecuteSqlRaw(@"CREATE TABLE IF NOT EXISTS ChallengeScores (
        Id int NOT NULL AUTO_INCREMENT PRIMARY KEY,
        PlayerId int NOT NULL,
        Day varchar(10) NOT NULL,
        Score int NOT NULL,
        CreatedAt datetime(6) NOT NULL,
        KEY IX_ChallengeScores_Day_Score (Day, Score),
        KEY IX_ChallengeScores_PlayerId (PlayerId),
        CONSTRAINT FK_ChallengeScores_Players_PlayerId FOREIGN KEY (PlayerId) REFERENCES Players (Id) ON DELETE CASCADE)");
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
else
{
    app.UseExceptionHandler("/Error");
    app.UseHsts();
}

app.UseCors();
app.UseStaticFiles(new StaticFileOptions
{
    ServeUnknownFileTypes = true
});

app.UseRouting();

app.UseAuthentication();
app.UseAuthorization();

app.MapRazorPages();

// ---- API Helpers --------------------------------------------------------
static PlayerDto ToDto(Player p) => new(p.Id, p.Name, p.Email, p.RecoveryCode, p.Coins, p.PowerLevel, p.SpeedLevel, p.FireRateLevel, p.CurrentStage, p.Stickers, p.AdsRemoved);

// Invite codes are derived from the player id (no extra column): "G" +
// base-36 of an offset multiple, so codes look random but decode exactly.
// Must match inviteCode() in the game (systems/rewards.js).
static string InviteCode(int id)
{
    const string digits = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    long n = (long)id * 7919 + 12345;
    var s = "";
    do { s = digits[(int)(n % 36)] + s; n /= 36; } while (n > 0);
    return "G" + s;
}

static int? DecodeInviteCode(string? code)
{
    if (string.IsNullOrWhiteSpace(code)) return null;
    code = code.Trim().ToUpperInvariant();
    if (!code.StartsWith('G') || code.Length < 2 || code.Length > 12) return null;
    const string digits = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    long n = 0;
    foreach (var ch in code[1..])
    {
        var d = digits.IndexOf(ch);
        if (d < 0) return null;
        n = n * 36 + d;
    }
    n -= 12345;
    if (n <= 0 || n % 7919 != 0) return null;
    return (int)(n / 7919);
}

static string GenerateRecoveryCode()
{
    const string chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    var buf = new char[8];
    for (var i = 0; i < buf.Length; i++) buf[i] = chars[Random.Shared.Next(chars.Length)];
    return $"{new string(buf, 0, 4)}-{new string(buf, 4, 4)}";
}

static async Task<string> GenerateUniqueRecoveryCode(GateWallDbContext db)
{
    string code;
    do { code = GenerateRecoveryCode(); }
    while (await db.Players.AnyAsync(p => p.RecoveryCode == code));
    return code;
}

// ---- Player registration / sync (API Endpoints) -------------------------
app.MapPost("/api/players/register", async (RegisterRequest req, GateWallDbContext db) =>
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
.AllowAnonymous()
.WithOpenApi();

app.MapPut("/api/players/{id:int}/sync", async (int id, SyncRequest req, GateWallDbContext db) =>
{
    var player = await db.Players.FindAsync(id);
    if (player is null) return Results.NotFound();
    if (player.IsBanned) return Results.Forbid();

    if (!string.IsNullOrWhiteSpace(req.Name)) player.Name = req.Name!.Trim().Substring(0, Math.Min(14, req.Name!.Trim().Length));
    if (req.Email is not null) player.Email = string.IsNullOrWhiteSpace(req.Email) ? null : req.Email.Trim();
    if (req.Coins is int c) player.Coins = c;
    if (req.PowerLevel is int pl) player.PowerLevel = pl;
    if (req.SpeedLevel is int sl) player.SpeedLevel = sl;
    if (req.FireRateLevel is int fl) player.FireRateLevel = fl;
    if (req.CurrentStage is int st) player.CurrentStage = Math.Max(1, st);
    if (req.Stickers is not null) player.Stickers = req.Stickers;
    player.LastSeenAt = DateTime.UtcNow;

    await db.SaveChangesAsync();
    return Results.Ok(ToDto(player));
})
.WithName("SyncPlayer")
.AllowAnonymous()
.WithOpenApi();

app.MapGet("/api/players/{id:int}", async (int id, GateWallDbContext db) =>
{
    // Public view: never the recovery code or email (those go only to the owner at register).
    var player = await db.Players.FindAsync(id);
    if (player is null) return Results.NotFound();

    var bestScore = await db.Scores.Where(s => s.PlayerId == id)
        .OrderByDescending(s => s.Score)
        .Select(s => (int?)s.Score)
        .FirstOrDefaultAsync() ?? 0;

    return Results.Ok(new PublicProfileDto(player.Id, player.Name, bestScore, player.IsBanned));
})
.WithName("GetPlayer")
.AllowAnonymous()
.WithOpenApi();

app.MapPost("/api/players/recover", async (RecoverRequest req, GateWallDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(req.RecoveryCode)) return Results.BadRequest("RecoveryCode is required.");
    if (string.IsNullOrWhiteSpace(req.DeviceId)) return Results.BadRequest("DeviceId is required.");

    var code = req.RecoveryCode!.Trim().ToUpperInvariant();
    var player = await db.Players.FirstOrDefaultAsync(p => p.RecoveryCode == code);
    if (player is null) return Results.NotFound("No account found for that recovery code.");
    if (player.IsBanned) return Results.Forbid();

    var existingOnDevice = await db.Players.FirstOrDefaultAsync(p => p.DeviceId == req.DeviceId && p.Id != player.Id);
    if (existingOnDevice is not null) db.Players.Remove(existingOnDevice);

    player.DeviceId = req.DeviceId;
    player.LastSeenAt = DateTime.UtcNow;
    await db.SaveChangesAsync();
    return Results.Ok(ToDto(player));
})
.WithName("RecoverPlayer")
.AllowAnonymous()
.WithOpenApi();

// ---- Store / In-App Purchases ----------------------------------------
app.MapPost("/api/store/verify", async (StoreVerificationRequest req, GateWallDbContext db, ILogger<Program> logger, IConfiguration config, IHttpClientFactory httpClientFactory) =>
{
    var player = await db.Players.FindAsync(req.PlayerId);
    if (player is null) return Results.NotFound("Unknown PlayerId");
    if (player.IsBanned) return Results.Forbid();

    // Replay protection: a coin pack pays once. A restored remove_ads
    // receipt re-confirms the entitlement for the player who bought it.
    var processed = await db.ProcessedReceipts.FirstOrDefaultAsync(r => r.TransactionId == req.TransactionId);
    if (processed is not null)
    {
        if (req.ProductId == "remove_ads" && processed.PlayerId == req.PlayerId)
        {
            player.AdsRemoved = true;
            await db.SaveChangesAsync();
            return Results.Ok(ToDto(player));
        }
        return Results.Conflict("Transaction already processed.");
    }

    bool isValid = false;
    var requireRealVerification = config.GetValue<bool>("Store:RequireRealVerification", true);

    if (requireRealVerification)
    {
        if (req.Platform == "apple")
        {
            var secret = config["Store:AppleSharedSecret"];
            if (string.IsNullOrEmpty(secret)) return Results.StatusCode(500);
            
            var client = httpClientFactory.CreateClient();
            // Apple's field name is hyphenated, so it can't be an anonymous-type property.
            var payload = new Dictionary<string, string> { ["receipt-data"] = req.ReceiptToken, ["password"] = secret };
            var response = await client.PostAsJsonAsync("https://buy.itunes.apple.com/verifyReceipt", payload);
            var json = await response.Content.ReadFromJsonAsync<JsonNode>();
            
            int status = json?["status"]?.GetValue<int>() ?? -1;
            
            if (status == 21007) // Sandbox receipt sent to production
            {
                response = await client.PostAsJsonAsync("https://sandbox.itunes.apple.com/verifyReceipt", payload);
                json = await response.Content.ReadFromJsonAsync<JsonNode>();
                status = json?["status"]?.GetValue<int>() ?? -1;
            }
            
            if (status != 0) 
            {
                logger.LogWarning($"Apple verify failed. Status: {status}");
                return Results.BadRequest("Verification failed.");
            }
            isValid = true;
        }
        else if (req.Platform == "google")
        {
            var packageName = config["Store:GooglePlay:PackageName"];
            // Whole service-account key JSON (same env var as Solvino:
            // GooglePlay__ServiceAccountJson), or the older email + PrivateKey pair.
            var keyJson = config["GooglePlay:ServiceAccountJson"] ?? config["Store:GooglePlay:ServiceAccountJson"];
            var email = config["Store:GooglePlay:ServiceAccountEmail"];
            var privateKey = config["Store:GooglePlay:PrivateKey"];
            if (string.IsNullOrEmpty(packageName)) return Results.StatusCode(500);

            Google.Apis.Http.IConfigurableHttpClientInitializer credential;
            if (!string.IsNullOrWhiteSpace(keyJson))
            {
                credential = GoogleCredential.FromJson(keyJson).CreateScoped(AndroidPublisherService.Scope.Androidpublisher);
            }
            else
            {
                if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(privateKey) || privateKey.Contains("..."))
                    return Results.StatusCode(500);
                credential = new ServiceAccountCredential(
                    new ServiceAccountCredential.Initializer(email)
                    {
                        Scopes = new[] { AndroidPublisherService.Scope.Androidpublisher }
                    }.FromPrivateKey(privateKey.Replace("\\n", "\n")));
            }

            var service = new AndroidPublisherService(new BaseClientService.Initializer
            {
                HttpClientInitializer = credential,
                ApplicationName = "SaveTheGate"
            });
            
            try 
            {
                var request = service.Purchases.Products.Get(packageName, req.ProductId, req.ReceiptToken);
                var purchase = await request.ExecuteAsync();
                
                if (purchase.PurchaseState == 0) // 0 = Purchased
                {
                    isValid = true;
                }
                else 
                {
                    logger.LogWarning($"Google verify failed. State: {purchase.PurchaseState}");
                    return Results.BadRequest("Purchase not complete.");
                }
            } 
            catch (Exception ex)
            {
                logger.LogError(ex, "Google verify exception.");
                return Results.BadRequest("Verification failed.");
            }
        }
        else
        {
            return Results.BadRequest("Unknown platform");
        }
    }
    else
    {
        logger.LogInformation($"Mocking successful verification for product {req.ProductId} on {req.Platform}.");
        isValid = true;
    }

    if (isValid)
    {
        // Apply the purchase
        if (req.ProductId == "remove_ads")
        {
            player.AdsRemoved = true;
        }
        else if (req.ProductId.StartsWith("coins_"))
        {
            // coins per pack — fixed here (must match game/src/data/shop.js);
            // deliberately not read from config so a stale server setting
            // can't pay the wrong amount
            var amount = StorePacks.Coins.GetValueOrDefault(req.ProductId);
            if (amount <= 0) return Results.BadRequest("Unknown product.");
            player.Coins += amount;
        }

        db.ProcessedReceipts.Add(new ProcessedReceipt
        {
            TransactionId = req.TransactionId,
            Platform = req.Platform,
            PlayerId = req.PlayerId
        });

        await db.SaveChangesAsync();
        return Results.Ok(ToDto(player));
    }

    return Results.BadRequest("Invalid receipt.");
})
.WithName("VerifyStoreReceipt")
.AllowAnonymous()
.WithOpenApi();


// ---- Invite friends ---------------------------------------------------
// A new player enters a friend's code: they're paid at once, and the
// friend collects their reward the next time they open the Rewards page.
app.MapGet("/api/invite/{id:int}", async (int id, GateWallDbContext db) =>
{
    var player = await db.Players.FindAsync(id);
    if (player is null) return Results.NotFound();
    var friends = await db.InviteClaims.CountAsync(c => c.InviterId == id);
    var unpaid = await db.InviteClaims.CountAsync(c => c.InviterId == id && !c.InviterPaid);
    var invited = await db.InviteClaims.AnyAsync(c => c.InviteeId == id);
    return Results.Ok(new InviteInfo(InviteCode(id), friends, unpaid, invited));
})
.WithName("InviteInfo")
.AllowAnonymous()
.WithOpenApi();

app.MapPost("/api/invite/claim", async (InviteClaimRequest req, GateWallDbContext db, IConfiguration config) =>
{
    var player = await db.Players.FindAsync(req.PlayerId);
    if (player is null || player.IsBanned) return Results.NotFound("Unknown player.");
    var inviterId = DecodeInviteCode(req.Code);
    if (inviterId is null || inviterId == player.Id) return Results.BadRequest("That code doesn't work.");
    var inviter = await db.Players.FindAsync(inviterId.Value);
    if (inviter is null || inviter.IsBanned) return Results.BadRequest("That code doesn't work.");
    if (await db.InviteClaims.AnyAsync(c => c.InviteeId == player.Id)) return Results.Conflict("You already used an invite code.");
    if (player.CreatedAt < DateTime.UtcNow.AddDays(-14)) return Results.BadRequest("Invite codes are for new players.");
    var maxPerInviter = config.GetValue<int?>("Invite:MaxFriends") ?? 30;
    if (await db.InviteClaims.CountAsync(c => c.InviterId == inviter.Id) >= maxPerInviter) return Results.BadRequest("That code is used up.");

    var coins = config.GetValue<int?>("Invite:FriendGets") ?? 500;
    db.InviteClaims.Add(new InviteClaim { InviterId = inviter.Id, InviteeId = player.Id });
    player.Coins += coins;
    await db.SaveChangesAsync();
    return Results.Ok(new InviteGrant(coins, inviter.Name));
})
.WithName("ClaimInvite")
.AllowAnonymous()
.WithOpenApi();

app.MapPost("/api/invite/collect", async (InviteCollectRequest req, GateWallDbContext db, IConfiguration config) =>
{
    var player = await db.Players.FindAsync(req.PlayerId);
    if (player is null || player.IsBanned) return Results.NotFound();
    var each = config.GetValue<int?>("Invite:YouGet") ?? 1000;
    // Flip the unpaid claims in one statement; only the rows this call flipped are paid.
    var flipped = await db.InviteClaims
        .Where(c => c.InviterId == player.Id && !c.InviterPaid)
        .ExecuteUpdateAsync(s => s.SetProperty(c => c.InviterPaid, true));
    var coins = flipped * each;
    if (coins > 0)
        await db.Players.Where(p => p.Id == player.Id)
            .ExecuteUpdateAsync(s => s.SetProperty(p => p.Coins, p => p.Coins + coins));
    return Results.Ok(new InviteGrant(coins, null));
})
.WithName("CollectInviteRewards")
.AllowAnonymous()
.WithOpenApi();

// ---- Scores / leaderboard --------------------------------------------
app.MapPost("/api/scores", async (ScoreSubmission req, GateWallDbContext db) =>
{
    var player = await db.Players.FindAsync(req.PlayerId);
    if (player is null) return Results.NotFound("Unknown PlayerId — call /api/players/register first.");
    if (player.IsBanned) return Results.Forbid();

    var entry = new ScoreEntry { PlayerId = req.PlayerId, Score = req.Score, StageReached = req.StageReached };
    db.Scores.Add(entry);
    await db.SaveChangesAsync();
    return Results.Created($"/api/scores/{entry.Id}", new { entry.Id, entry.PlayerId, entry.Score, entry.StageReached, entry.CreatedAt });
})
.WithName("SubmitScore")
.AllowAnonymous()
.WithOpenApi();

app.MapGet("/api/leaderboard/top", async (int count, GateWallDbContext db) =>
{
    var n = count <= 0 ? 20 : Math.Min(count, 100);

    // Best score per player, then the top n of those.
    var best = db.Scores
        .Where(s => s.Player != null && !s.Player.IsBanned && s.Player.Name.ToLower() != "admin")
        .GroupBy(s => s.PlayerId)
        .Select(g => new { PlayerId = g.Key, Score = g.Max(x => x.Score) });

    var top = await best
        .OrderByDescending(b => b.Score)
        .Take(n)
        .Join(db.Scores, b => new { b.PlayerId, b.Score }, s => new { s.PlayerId, s.Score }, (b, s) => s)
        .Include(s => s.Player)
        .ToListAsync();

    var rows = top
        .GroupBy(s => s.PlayerId)
        .Select(g => g.OrderBy(s => s.CreatedAt).First())
        .OrderByDescending(s => s.Score)
        .Select((s, i) => new LeaderboardRow(i + 1, s.Player!.Name, s.Score, s.StageReached, s.CreatedAt))
        .ToList();
    return Results.Ok(rows);
})
.WithName("GetTopLeaderboard")
.AllowAnonymous()
.WithOpenApi();

// ---- Daily Challenge -------------------------------------------------
// The day is the player's own calendar date (the rule of the day is picked
// from it on the client), so accept yesterday/today/tomorrow in UTC terms
// to cover every time zone, and nothing else.
static bool ChallengeDayOk(string? day)
{
    if (!DateOnly.TryParseExact(day, "yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var d)) return false;
    var today = DateOnly.FromDateTime(DateTime.UtcNow);
    return d >= today.AddDays(-1) && d <= today.AddDays(1);
}

app.MapPost("/api/challenge/score", async (ChallengeScoreSubmission req, GateWallDbContext db) =>
{
    if (!ChallengeDayOk(req.Day)) return Results.BadRequest("Bad day.");
    if (req.Score < 0) return Results.BadRequest("Bad score.");
    var player = await db.Players.FindAsync(req.PlayerId);
    if (player is null) return Results.NotFound("Unknown PlayerId — call /api/players/register first.");
    if (player.IsBanned) return Results.Forbid();

    var entry = new ChallengeScore { PlayerId = req.PlayerId, Day = req.Day, Score = req.Score };
    db.ChallengeScores.Add(entry);
    await db.SaveChangesAsync();
    return Results.Created($"/api/challenge/score/{entry.Id}", new { entry.Id, entry.PlayerId, entry.Day, entry.Score, entry.CreatedAt });
})
.WithName("SubmitChallengeScore")
.AllowAnonymous()
.WithOpenApi();

app.MapGet("/api/challenge/top", async (string day, int? count, GateWallDbContext db) =>
{
    if (!ChallengeDayOk(day)) return Results.BadRequest("Bad day.");
    var n = count is null or <= 0 ? 10 : Math.Min(count.Value, 50);

    var candidates = await db.ChallengeScores
        .Include(c => c.Player)
        .Where(c => c.Day == day && c.Player != null && !c.Player.IsBanned && c.Player.Name.ToLower() != "admin")
        .OrderByDescending(c => c.Score)
        .Take(n * 10)
        .ToListAsync();

    var seenPlayers = new HashSet<int>();
    var rows = new List<ChallengeRow>();
    foreach (var c in candidates)
    {
        if (!seenPlayers.Add(c.PlayerId)) continue;
        rows.Add(new ChallengeRow(rows.Count + 1, c.PlayerId, c.Player!.Name, c.Score));
        if (rows.Count >= n) break;
    }
    return Results.Ok(rows);
})
.WithName("GetChallengeTop")
.AllowAnonymous()
.WithOpenApi();

app.MapGet("/api/health", () => Results.Ok(new { status = "ok", time = DateTime.UtcNow }))
.WithName("HealthCheck")
.AllowAnonymous()
.WithOpenApi();

app.Run();

// ---- DTOs -----------------------------------------------------------
record RegisterRequest(string DeviceId, string? Name, string? Email);
record PlayerDto(int Id, string Name, string? Email, string RecoveryCode, int Coins, int PowerLevel, int SpeedLevel, int FireRateLevel, int CurrentStage, string Stickers, bool AdsRemoved);
record PlayerProfileDto(PlayerDto Player, int BestScore, bool IsBanned);
record PublicProfileDto(int Id, string Name, int BestScore, bool IsBanned);
record SyncRequest(string? Name, string? Email, int? Coins, int? PowerLevel, int? SpeedLevel, int? FireRateLevel, int? CurrentStage, string? Stickers);
record RecoverRequest(string RecoveryCode, string DeviceId);
record ScoreSubmission(int PlayerId, int Score, int StageReached);
record LeaderboardRow(int Rank, string Name, int Score, int StageReached, DateTime CreatedAt);
record ChallengeScoreSubmission(int PlayerId, string Day, int Score);
record ChallengeRow(int Rank, int PlayerId, string Name, int Score);
record StoreVerificationRequest(int PlayerId, string Platform, string ProductId, string ReceiptToken, string TransactionId);
record InviteInfo(string Code, int Friends, int Unpaid, bool Invited);
record InviteClaimRequest(int PlayerId, string Code);
record InviteCollectRequest(int PlayerId);
record InviteGrant(int Coins, string? InviterName);

// Coins granted per store product (game/src/data/shop.js has the same table).
static class StorePacks
{
    public static readonly Dictionary<string, int> Coins = new()
    {
        ["coins_small"] = 4000,   // $3.99
        ["coins_medium"] = 9000,  // $7.99
        ["coins_large"] = 20000,  // $15.99
    };
}
