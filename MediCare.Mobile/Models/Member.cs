namespace MediCare.Mobile.Models
{
    public class Member
    {
        public int Id { get; set; }
        public string UserId { get; set; }
        public string FullName { get; set; }
        public string IDNo { get; set; }

        public decimal Balance { get; set; }
        public decimal Shares { get; set; }
    }
}