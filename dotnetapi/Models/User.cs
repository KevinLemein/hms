using System.ComponentModel;

namespace Business.Entities
{
    public class User
    {
        public long Id { get; set; }

        public DateTime CreatedAt { get; set; }

        public required string Email { get; set; }

        public bool Enabled { get; set; }

        public required string FirstName { get; set; }

        public required string LastName { get; set; }

        public required string Password { get; set; }

        public required string Role { get; set; }

        public DateTime? UpdatedAt { get; set; }

        public required string Username { get; set; }
    }
    
}
