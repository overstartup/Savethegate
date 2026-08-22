using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace GateWall.Admin.Pages;

[AllowAnonymous]
public class LegalModel : PageModel
{
    public void OnGet()
    {
    }
}
