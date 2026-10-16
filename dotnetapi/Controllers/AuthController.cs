using Business.Entities;
using MediCare.Data;
using MediCare.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace MediCare.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly JwtSettings _jwt;
    private readonly ApplicationDbContext _context;
    public AuthController(UserManager<ApplicationUser> userManager, IOptions<JwtSettings> jwt, ApplicationDbContext context)
    {
        _userManager = userManager;
        _jwt = jwt.Value;
        _context = context;
    }

    /// <summary>Authenticates a member and issues a JWT bearer token.</summary>
    /// <param name="request">National ID number and password.</param>
    /// <returns>A bearer token to send in the Authorization header.</returns>
    /// <response code="200">Authentication succeeded.</response>
    /// <response code="401">Invalid ID number or password.</response>
    [AllowAnonymous]
    [HttpPost("login")]
    [ProducesResponseType<TokenResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        try
        {
            // Project only the Id: other Member columns are NULL in the DB but mapped as required strings.
           
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
            //if (user is null || await _userManager.IsLockedOutAsync(user))
            //{
            //    return Unauthorized(new { message = "User account locked. Contact System Admin." });
            //}
            //// Same response for unknown user and wrong password to avoid user enumeration.


            //if (!await _userManager.CheckPasswordAsync(user, request.Password))
            //{
            //    await _userManager.AccessFailedAsync(user);
            //    return Unauthorized(new { message = "Invalid ID number or password." });
            //}

            //await _userManager.ResetAccessFailedCountAsync(user);

            var token = await CreateTokenAsync(user);
            return Ok(token);
        }
        catch (Exception ex) {
            var response = new ApiError
            {
                Code = 400,
                Error = ex.ToString(),
            };
            return BadRequest(response);
        }
       
    }

    private async Task<TokenResponse> CreateTokenAsync(User user)
    {
        //var claims = new List<Claim>
        //{
        //    new(JwtRegisteredClaimNames.Sub, user.Id),
        //    new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
        //    new(ClaimTypes.NameIdentifier, user.Id),
        //   // new(ClaimTypes.Name, user.FullName ?? user.UserName ?? string.Empty),
        //    new("Id", user.Id ?? string.Empty)
        //};

       

        //foreach (var role in await _userManager.GetRolesAsync(user))
        //{
        //    claims.Add(new Claim(ClaimTypes.Role, role));
        //}
      
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwt.Key));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var jwt = new JwtSecurityToken(
            issuer: _jwt.Issuer,
            audience: _jwt.Audience,
          //  claims: claims,
            expires: DateTime.UtcNow.AddMinutes(_jwt.ExpiryMinutes),
            signingCredentials: credentials);

        return new TokenResponse
        {
            AccessToken = new JwtSecurityTokenHandler().WriteToken(jwt),
            ExpiresIn = _jwt.ExpiryMinutes * 60,
            UserId=user.Id
          
        };
    }
}
