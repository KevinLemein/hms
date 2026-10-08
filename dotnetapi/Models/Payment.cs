using System.Text.Json.Serialization;

namespace Business.Entities
{
    public class Payment:CreateFields
    {
        public int Id { get; set; }
        public DateTime DatePaid { get; set; }
        public long AppointmentId { get; set; }
        [JsonIgnore]
        public Appointment Appointment { get; set; }
        public decimal TotalAmount { get; set; }
        public string TransactionCode { get; set; }
        
    }

}
