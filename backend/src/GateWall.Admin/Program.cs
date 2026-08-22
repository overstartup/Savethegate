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

var connectionString = builder.Configuration.GetConnectionString("Default")
    ?? "Server=localhost;Port=3306;Database=gatewall;User=gatewall;Password=changeme;";
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
    var player = await db.Players.FindAsync(id);
    if (player is null) return Results.NotFound();

    var bestScore = await db.Scores.Where(s => s.PlayerId == id)
        .OrderByDescending(s => s.Score)
        .Select(s => (int?)s.Score)
        .FirstOrDefaultAsync() ?? 0;

    return Results.Ok(new PlayerProfileDto(ToDto(player), bestScore, player.IsBanned));
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

    // Replay protection
    if (await db.ProcessedReceipts.AnyAsync(r => r.TransactionId == req.TransactionId))
    {
        return Results.BadRequest("Transaction already processed.");
    }

    bool isValid = false;
    var requireRealVerification = config.GetValue<bool>("Store:RequireRealVerification", false);

    if (requireRealVerification)
    {
        if (req.Platform == "apple")
        {
            var secret = config["Store:AppleSharedSecret"];
            if (string.IsNullOrEmpty(secret)) return Results.StatusCode(500);
            
            var client = httpClientFactory.CreateClient();
            var payload = new { receipt_data = req.ReceiptToken, password = secret };
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
            var email = config["Store:GooglePlay:ServiceAccountEmail"];
            var privateKey = config["Store:GooglePlay:PrivateKey"];
            
            if (string.IsNullOrEmpty(packageName) || string.IsNullOrEmpty(email) || string.IsNullOrEmpty(privateKey))
                return Results.StatusCode(500);

            var credential = new ServiceAccountCredential(
                new ServiceAccountCredential.Initializer(email)
                {
                    Scopes = new[] { AndroidPublisherService.Scope.Androidpublisher }
                }.FromPrivateKey(privateKey.Replace("\\n", "\n")));

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
            if (int.TryParse(req.ProductId.Split('_')[1], out var amount))
            {
                player.Coins += amount;
            }
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

    var candidates = await db.Scores
        .Include(s => s.Player)
        .Where(s => s.Player != null && !s.Player.IsBanned && s.Player.Name.ToLower() != "admin")
        .OrderByDescending(s => s.Score)
        .Take(n * 10)
        .ToListAsync();

    var seenPlayers = new HashSet<int>();
    var rows = new List<LeaderboardRow>();
    foreach (var s in candidates)
    {
        if (!seenPlayers.Add(s.PlayerId)) continue;
        rows.Add(new LeaderboardRow(rows.Count + 1, s.Player!.Name, s.Score, s.StageReached, s.CreatedAt));
        if (rows.Count >= n) break;
    }
    return Results.Ok(rows);
})
.WithName("GetTopLeaderboard")
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
record SyncRequest(string? Name, string? Email, int? Coins, int? PowerLevel, int? SpeedLevel, int? FireRateLevel, int? CurrentStage, string? Stickers);
record RecoverRequest(string RecoveryCode, string DeviceId);
record ScoreSubmission(int PlayerId, int Score, int StageReached);
record LeaderboardRow(int Rank, string Name, int Score, int StageReached, DateTime CreatedAt);
record StoreVerificationRequest(int PlayerId, string Platform, string ProductId, string ReceiptToken, string TransactionId);
