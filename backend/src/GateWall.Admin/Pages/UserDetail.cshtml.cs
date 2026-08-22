using System.Text.Json;
using GateWall.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;

namespace GateWall.Admin.Pages;

public class StickerDto
{
    public string? id { get; set; }
    public string? name { get; set; }
    public int blood { get; set; }
    public int damage { get; set; }
    public bool equipped { get; set; }
}

public class UserDetailModel(GateWallDbContext db) : PageModel
{
    public Player? Player { get; set; }
    public List<ScoreEntry> Scores { get; set; } = new();
    public List<StickerDto> Stickers { get; set; } = new();

    public async Task<IActionResult> OnGetAsync(int id)
    {
        Player = await db.Players.FindAsync(id);
        if (Player == null)
        {
            return NotFound();
        }

        Scores = await db.Scores
            .Where(s => s.PlayerId == id)
            .OrderByDescending(s => s.CreatedAt)
            .Take(50)
            .ToListAsync();

        if (!string.IsNullOrWhiteSpace(Player.Stickers))
        {
            try
            {
                Stickers = JsonSerializer.Deserialize<List<StickerDto>>(Player.Stickers, new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new();
            }
            catch
            {
                // Fallback to empty if malformed
            }
        }

        return Page();
    }
}
