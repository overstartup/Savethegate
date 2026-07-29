using CrystalGate.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;

namespace CrystalGate.Admin.Pages;

public class UsersModel(CrystalGateDbContext db) : PageModel
{
    public List<Player> Players { get; set; } = new();
    public Dictionary<int, int> BestScores { get; set; } = new();

    [TempData]
    public string? StatusMessage { get; set; }

    public async Task OnGetAsync()
    {
        Players = await db.Players.OrderByDescending(p => p.LastSeenAt).ToListAsync();
        BestScores = await db.Scores
            .GroupBy(s => s.PlayerId)
            .Select(g => new { g.Key, Best = g.Max(s => s.Score) })
            .ToDictionaryAsync(x => x.Key, x => x.Best);
    }

    public async Task<IActionResult> OnPostRenameAsync(int id, string newName)
    {
        var p = await db.Players.FindAsync(id);
        if (p is not null && !string.IsNullOrWhiteSpace(newName))
        {
            p.Name = newName.Trim().Substring(0, Math.Min(14, newName.Trim().Length));
            await db.SaveChangesAsync();
            StatusMessage = $"Renamed player #{id} to \"{p.Name}\".";
        }
        return RedirectToPage();
    }

    public async Task<IActionResult> OnPostToggleBanAsync(int id)
    {
        var p = await db.Players.FindAsync(id);
        if (p is not null)
        {
            p.IsBanned = !p.IsBanned;
            await db.SaveChangesAsync();
            StatusMessage = p.IsBanned ? $"Banned player #{id}." : $"Unbanned player #{id}.";
        }
        return RedirectToPage();
    }

    public async Task<IActionResult> OnPostDeleteAsync(int id)
    {
        var p = await db.Players.FindAsync(id);
        if (p is not null)
        {
            db.Players.Remove(p); // cascades to their ScoreEntry rows
            await db.SaveChangesAsync();
            StatusMessage = $"Deleted player #{id}.";
        }
        return RedirectToPage();
    }
}
