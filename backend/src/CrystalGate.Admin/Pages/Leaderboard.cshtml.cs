using CrystalGate.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;

namespace CrystalGate.Admin.Pages;

public class LeaderboardModel(CrystalGateDbContext db) : PageModel
{
    public List<ScoreEntry> Entries { get; set; } = new();

    [TempData]
    public string? StatusMessage { get; set; }

    public async Task OnGetAsync()
    {
        Entries = await db.Scores
            .Include(s => s.Player)
            .OrderByDescending(s => s.Score)
            .Take(100)
            .ToListAsync();
    }

    public async Task<IActionResult> OnPostDeleteAsync(int id)
    {
        var entry = await db.Scores.FindAsync(id);
        if (entry is not null)
        {
            db.Scores.Remove(entry);
            await db.SaveChangesAsync();
            StatusMessage = $"Removed score entry #{id}.";
        }
        return RedirectToPage();
    }
}
