using System.ComponentModel.DataAnnotations;

namespace MediCare.Models;

public class LoginRequest
{
 
    public string Email { get; set; } = string.Empty;


    public string Password { get; set; } = string.Empty;
}

public class TokenResponse
{
    public string AccessToken { get; set; } = string.Empty;
    public string TokenType { get; set; } = "Bearer";
    public int ExpiresIn { get; set; }
    public long UserId { get; set; }

}

public class JwtSettings
{
    public string Issuer { get; set; } = string.Empty;
    public string Audience { get; set; } = string.Empty;
    public string Key { get; set; } = string.Empty;
    public int ExpiryMinutes { get; set; } = 60;
}
public class ApiError
{
    public int Code { get; set; }
    public string Error { get; set; }

}
