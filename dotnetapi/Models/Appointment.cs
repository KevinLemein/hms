using System.Text.Json.Serialization;

namespace Business.Entities
{
    public class Appointment
    {
        public long Id { get; set; }
        public DateTime AppointmentDateTime { get; set; }
        public int? StatusId { get; set; }
        public string Status { get; set; }
        public DateTime CreatedAt { get; set; }
        public string? Notes { get; set; }       // Nullable since text can be null
        public string? Reason { get; set; }      // Nullable since text can be null
        public DateTime? UpdatedAt { get; set; } // Nullable
        public long DoctorId { get; set; }
        public Doctor Doctor { get; set; }
        public long PatientId { get; set; }
        public Patient Patient { get; set; }
    }

    public class AppointmentStatus : CreateFields
    {
        public int Id { get; set; }
        public string Name { get; set; }
    }
    public class Prescription
    {
        public long Id { get; set; }
        public long? AppointmentId { get; set; }
        [JsonIgnore]
        public Appointment Appointment { get; set; }
        
        public int? DrugId { get; set; }
        [JsonIgnore]
        public Drug Drug { get; set; }
        public string DrugName =>Drug?.Name;
        public int Dossage { get; set; }
        public string Duration { get; set; }
        
        public DateTime CreatedOn { get; set; }
        public long DoctorId { get; set; }
        [JsonIgnore]
        public Doctor Doctor { get; set; }
        public string Notes { get; set; }
    }
    public class MedicalRecord : CreateFields
    {
        public long Id { get; set; }
        public long? AppointmentId { get; set; }
        [JsonIgnore]
        public Appointment Appointment { get; set; }
        public string Diagnosis { get; set; }
  
    }
}
