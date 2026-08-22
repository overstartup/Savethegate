using Microsoft.EntityFrameworkCore;

namespace GateWall.Data;

public class GateWallDbContext(DbContextOptions<GateWallDbContext> options) : DbContext(options)
{
    public DbSet<Player> Players => Set<Player>();
    public DbSet<ScoreEntry> Scores => Set<ScoreEntry>();
    public DbSet<ProcessedReceipt> ProcessedReceipts => Set<ProcessedReceipt>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // MySQL can't put a unique/plain index on an unbounded TEXT column
        // without an explicit key-length prefix, so every indexed string
        // column needs a MaxLength (this was a no-op under the old SQLite
        // provider, which has no such restriction).
        modelBuilder.Entity<Player>()
            .Property(p => p.DeviceId)
            .HasMaxLength(255);

        modelBuilder.Entity<Player>()
            .Property(p => p.RecoveryCode)
            .HasMaxLength(64);

        modelBuilder.Entity<ProcessedReceipt>()
            .Property(r => r.TransactionId)
            .HasMaxLength(255);

        modelBuilder.Entity<Player>()
            .HasIndex(p => p.DeviceId)
            .IsUnique();

        modelBuilder.Entity<Player>()
            .HasIndex(p => p.RecoveryCode)
            .IsUnique();

        modelBuilder.Entity<ScoreEntry>()
            .HasOne(s => s.Player)
            .WithMany(p => p.Scores)
            .HasForeignKey(s => s.PlayerId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ScoreEntry>()
            .HasIndex(s => s.Score);

        modelBuilder.Entity<ProcessedReceipt>()
            .HasIndex(r => r.TransactionId)
            .IsUnique();

        // --- SEED DATA ---
        var players = new List<Player>();
        var scores = new List<ScoreEntry>();
        var rnd = new Random(42); // fixed seed for predictable fake data
        
        string[] prefixes = { "Shadow", "Light", "Crystal", "Iron", "Storm", "Fire", "Ice", "Void", "Star", "Moon", "Sun", "Night", "Day", "Blood", "Soul" };
        string[] suffixes = { "Hunter", "Bringer", "Mage", "Knight", "Rogue", "Warrior", "King", "Queen", "Lord", "Walker", "Weaver", "Forged", "Born", "Caster", "Striker" };

        // Admin User
        var admin = new Player
        {
            Id = 1,
            DeviceId = "admin-device-id-12345",
            Name = "Admin",
            Email = "admin@gatewall.test",
            RecoveryCode = "admin-recovery",
            Coins = 999999,
            CurrentStage = 12,
            CreatedAt = DateTime.UtcNow.AddDays(-30),
            LastSeenAt = DateTime.UtcNow
        };
        players.Add(admin);
        scores.Add(new ScoreEntry
        {
            Id = 1,
            PlayerId = 1,
            Score = 999999,
            StageReached = 12,
            CreatedAt = DateTime.UtcNow.AddDays(-1)
        });

        // 100 Fake Users
        for (int i = 2; i <= 101; i++)
        {
            string name = prefixes[rnd.Next(prefixes.Length)] + suffixes[rnd.Next(suffixes.Length)];
            
            // Random score between 1,000 and 150,000
            int score = rnd.Next(1000, 150000);
            
            players.Add(new Player
            {
                Id = i,
                DeviceId = $"fake-device-{i}",
                Name = name,
                RecoveryCode = $"fake-recovery-{i}",
                CreatedAt = DateTime.UtcNow.AddDays(-rnd.Next(1, 30)),
                LastSeenAt = DateTime.UtcNow.AddMinutes(-rnd.Next(1, 1000))
            });
            
            scores.Add(new ScoreEntry
            {
                Id = i,
                PlayerId = i,
                Score = score,
                StageReached = rnd.Next(1, 12),
                CreatedAt = DateTime.UtcNow.AddDays(-rnd.Next(0, 5))
            });
        }

        modelBuilder.Entity<Player>().HasData(players);
        modelBuilder.Entity<ScoreEntry>().HasData(scores);
    }
}
