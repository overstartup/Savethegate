using GateWall.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;

namespace GateWall.Admin.Pages;

public class UsersModel(GateWallDbContext db) : PageModel
{
    public List<Player> Players { get; set; } = new();
    public Dictionary<int, int> BestScores { get; set; } = new();

    [BindProperty(SupportsGet = true)]
    public int PageNum { get; set; } = 1;
    public int TotalPages { get; set; }

    [TempData]
    public string? StatusMessage { get; set; }

    public async Task OnGetAsync()
    {
        if (PageNum < 1) PageNum = 1;
        int pageSize = 20;

        var totalPlayers = await db.Players.CountAsync();
        TotalPages = (int)Math.Ceiling(totalPlayers / (double)pageSize);

        Players = await db.Players
            .OrderByDescending(p => p.LastSeenAt)
            .Skip((PageNum - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
            
        var playerIds = Players.Select(p => p.Id).ToList();

        BestScores = await db.Scores
            .Where(s => playerIds.Contains(s.PlayerId))
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
