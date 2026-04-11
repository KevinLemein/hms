namespace Business.Entities;

public class User
{
    public long Id { get; set; }
    public DateTime CreatedAt { get; set; }
    public string Email { get; set; }
    public bool Enabled { get; set; }
    public string FirstName { get; set; }
    public string LastName { get; set; }
    public string Password { get; set; }
    public string Role { get; set; }
    public DateTime? UpdatedAt { get; set; }  // Nullable since updated_at can be null
    public string Username { get; set; }
}