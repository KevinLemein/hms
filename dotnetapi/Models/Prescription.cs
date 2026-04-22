using System.Text.Json.Serialization;

namespace Business.Entities;

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
    public string Dossage { get; set; }
    public string Duration { get; set; }
        
    public DateTime CreatedOn { get; set; }
    public long DoctorId { get; set; }
    [JsonIgnore]
    public Doctor Doctor { get; set; }
    public string Notes { get; set; }
    public int? Quantity { get; set; }
}