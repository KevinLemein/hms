using Microsoft.AspNetCore.Identity;

namespace Business.Entities;

public class ApplicationUser : IdentityUser
{
    public string FirstName { get; set; }
    public string MiddleName { get; set; }
    public string LastName { get; set; }
    public string Name=> $"{FirstName} {MiddleName} {LastName}";
}

public class UserVm
{
    public string Id { get; set; }
    public string FirstName { get; set; }
    public string MiddleName { get; set; }
    public string LastName { get; set; }
    public string Email { get; set; } 
    public string PhoneNumber { get; set; }
    
}

public class ApplicationRole : IdentityRole
{

}