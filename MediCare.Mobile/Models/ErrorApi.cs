namespace MediCare.Mobile.Models
{
    public class ErrorApi
    {
        public string Error { get; set; }
        public string Message { get; set; }
        // Stable backend error code, e.g. INVALID_CREDENTIALS, VALIDATION_FAILED.
        public string Code { get; set; }
        public Dictionary<string, string> Errors { get; set; }
    }
    public class LoginVm
    {
        public string Email { get; set; }
        public string Password { get; set; }
    }

    // Every backend response is wrapped as { success, message, data, timestamp }.
    public class ApiResponse<T>
    {
        public bool Success { get; set; }
        public string Message { get; set; }
        public T Data { get; set; }
    }

    public class AuthResponseVm
    {
        public string Token { get; set; }
        public string Type { get; set; }
        public long Id { get; set; }
        public string Username { get; set; }
        public string Email { get; set; }
        public string Role { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public DateTimeOffset ExpiresAt { get; set; }
    }

    public class User
    {
        public string id { get; set; }
        public string name { get; set; }
        public object saccoName { get; set; }
        public int balance { get; set; }
    }
   
}