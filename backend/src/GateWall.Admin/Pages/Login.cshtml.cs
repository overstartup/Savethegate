using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace GateWall.Admin.Pages;

[AllowAnonymous]
public class LoginModel(IConfiguration config) : PageModel
{
    [BindProperty]
    public string Username { get; set; } = "";
    [BindProperty]
    public string Password { get; set; } = "";

    public string? Error { get; set; }

    public void OnGet() { }

    public async Task<IActionResult> OnPostAsync()
    {
        var expectedUser = config["Admin:Username"] ?? "admin";
        var expectedPass = config["Admin:Password"] ?? "ChangeMe123!";

        if (Username == expectedUser && Password == expectedPass)
        {
            var claims = new List<Claim> { new(ClaimTypes.Name, Username) };
            var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
            await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, new ClaimsPrincipal(identity));
            return RedirectToPage("/Users");
        }

        Error = "Invalid username or password.";
        return Page();
    }
}
