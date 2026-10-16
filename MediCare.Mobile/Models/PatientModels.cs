namespace MediCare.Mobile.Models
{
    // Shapes mirror the backend's DoctorResponse/AppointmentResponse/PrescriptionResponse.
    public class DoctorVm
    {
        public long Id { get; set; }
        public string FirstName { get; set; } = "";
        public string LastName { get; set; } = "";
        public string Specialty { get; set; } = "";

        public override string ToString() => $"Dr. {FirstName} {LastName} ({Specialty})";
    }

    public class BookAppointmentVm
    {
        public long PatientId { get; set; }
        public long DoctorId { get; set; }
        public DateTime AppointmentDateTime { get; set; }
        public string? Reason { get; set; }
    }

    public class AppointmentVm
    {
        public long Id { get; set; }
        public long DoctorId { get; set; }
        public string DoctorFirstName { get; set; } = "";
        public string DoctorLastName { get; set; } = "";
        public DateTime AppointmentDateTime { get; set; }
        public string? Reason { get; set; }
        // PENDING, WAITING, IN_CONSULTATION, COMPLETED, CANCELLED, NO_SHOW
        public string AppointmentStatus { get; set; } = "PENDING";
        public string? Notes { get; set; }

        public string DoctorName => $"Dr. {DoctorFirstName} {DoctorLastName}";
        public string DateText => AppointmentDateTime.ToString("ddd, dd MMM yyyy");
        public string TimeText => AppointmentDateTime.ToString("HH:mm");
        public string StatusText => AppointmentStatus.Replace('_', ' ');
        public bool HasNotes => !string.IsNullOrWhiteSpace(Notes);
        public bool IsUpcoming => AppointmentStatus is "PENDING" or "WAITING" or "IN_CONSULTATION";
        public bool CanModify => AppointmentStatus is "PENDING" or "WAITING";
        public Color StatusColor => AppointmentStatus switch
        {
            "COMPLETED" => Colors.SeaGreen,
            "CANCELLED" or "NO_SHOW" => Colors.IndianRed,
            "IN_CONSULTATION" => Colors.DodgerBlue,
            _ => Colors.DarkOrange
        };
    }

    public class PrescriptionVm
    {
        public long Id { get; set; }
        public long AppointmentId { get; set; }
        public string DrugName { get; set; } = "";
        public int DrugMilligrams { get; set; }
        // Spelled as in the backend contract.
        public string Dossage { get; set; } = "";
        public string Duration { get; set; } = "";
        public string? Notes { get; set; }
        public int Quantity { get; set; }
        public DateTime CreatedOn { get; set; }
        public DateTime AppointmentDateTime { get; set; }
        public string PrescribedByFirstName { get; set; } = "";
        public string PrescribedByLastName { get; set; } = "";

        public string DrugTitle => $"{DrugName} {DrugMilligrams}mg";
        public string DoctorName => $"Dr. {PrescribedByFirstName} {PrescribedByLastName}";
        public string DateText => CreatedOn.ToString("dd MMM yyyy");
        public string QuantityText => $"Qty: {Quantity}";
        public bool HasNotes => !string.IsNullOrWhiteSpace(Notes);
    }

    // Grid row: an appointment that has prescriptions.
    public class AppointmentRow
    {
        public AppointmentRow(AppointmentVm appointment, int prescriptionCount)
        {
            AppointmentId = appointment.Id;
            DateText = appointment.AppointmentDateTime.ToString("dd MMM yyyy HH:mm");
            DoctorName = appointment.DoctorName;
            Reason = appointment.Reason;
            PrescriptionCount = prescriptionCount;
        }

        public long AppointmentId { get; }
        public string DateText { get; }
        public string DoctorName { get; }
        public string? Reason { get; }
        public int PrescriptionCount { get; }
    }
}
