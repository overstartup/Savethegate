using Microsoft.EntityFrameworkCore;

namespace CrystalGate.Data;

public class CrystalGateDbContext(DbContextOptions<CrystalGateDbContext> options) : DbContext(options)
{
    public DbSet<Player> Players => Set<Player>();
    public DbSet<ScoreEntry> Scores => Set<ScoreEntry>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
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
    }
}
