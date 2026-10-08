using System.ComponentModel;
using System.Text.Json.Serialization;

namespace Business.Entities
{
    public class Doctor:CreateFields
    {
        public long Id { get; set; }
        public long UserId { get; set; }
        public User User { get; set; }
        [DisplayName("Speciality")]
        public int? SpecialityId { get; set; }
        public Speciality Speciality { get; set; }
        public bool IsAvailable { get; set; }
    }
    public class DoctorVm:CreateFields
    {
        public long Id { get; set; }
        public long UserId { get; set; }
        [JsonIgnore]
        public User User { get; set; }
        [DisplayName("Speciality")]
        public int? SpecialityId { get; set; }
        public string Speciality { get; set; }
        public bool IsAvailable { get; set; }
        
        public string FirstName { get; set; }
        public string MiddleName { get; set; }
        public string LastName { get; set; }
    }
}
