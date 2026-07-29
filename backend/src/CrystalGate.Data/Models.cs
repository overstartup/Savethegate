namespace CrystalGate.Data;

// A registered Guardian (player). Identified primarily by DeviceId so the
// mobile client can register/find "itself" without needing a real login —
// the display Name is whatever the player typed into the in-game name entry
// screen and can be changed at will (kept unique-ish but not enforced).
public class Player
{
    public int Id { get; set; }
    public string DeviceId { get; set; } = "";       // opaque client-generated id (e.g. a UUID stored on-device)
    public string Name { get; set; } = "Guardian";
    public string? Email { get; set; }               // optional — lets a player attach an email for account recovery
    public string RecoveryCode { get; set; } = "";   // server-generated unique code the player can save and re-enter
                                                       // on a new device/reinstall to reclaim this same account
    public int Coins { get; set; }
    public int PowerLevel { get; set; }              // "strength" — permanent damage upgrade level
    public int SpeedLevel { get; set; }
    public int FireRateLevel { get; set; }
    public int CurrentStage { get; set; } = 1;       // persisted progress — which stage the player is currently on
    public bool IsBanned { get; set; }               // admin can ban a player from the leaderboard
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime LastSeenAt { get; set; } = DateTime.UtcNow;

    public ICollection<ScoreEntry> Scores { get; set; } = new List<ScoreEntry>();
}

// A single submitted run result. We keep every submission (not just the
// best) so the admin panel and future analytics can see play history; the
// leaderboard query just takes MAX(Score) per player, or top-N raw rows —
// see ScoreEntry queries in the API.
public class ScoreEntry
{
    public int Id { get; set; }
    public int PlayerId { get; set; }
    public Player? Player { get; set; }
    public int Score { get; set; }
    public int StageReached { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
