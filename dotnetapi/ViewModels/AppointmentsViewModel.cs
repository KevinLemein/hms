using Business.Entities;

namespace MediCare.ViewModels;

public class AppointmentsVm:ApiStatus
{
   
        public long Id { get; set; }
        public long? DoctorId { get; set; }
        public string Doctor { get; set; }
        public long PatientId { get; set; }
        public string Patient { get; set; }
        public DateTime AppointmentDateTime { get; set; }
        public int StatusId { get; set; }
        public string Status { get; set; }
    
}

public class AppointmentDetailVm
{
    public AppointmentsVm Appointment { get; set; }
    public MedicalRecord MedicalRecord { get; set; }
    public List<Prescription> Prescriptions { get; set; }
}

public class ApiStatus
{
    public int Code { get; set; }
    public string Message { get; set; }
    public string Error { get; set; }
}

public class AppointmentCreateVm
{
    public int Id { get; set; }
    public int? DoctorId { get; set; }
    public int PatientId { get; set; }
    public DateTime AppointmentDate { get; set; }
    public int StatusId { get; set; }
}
