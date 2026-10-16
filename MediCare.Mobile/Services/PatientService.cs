using MediCare.Mobile.Models;

namespace MediCare.Mobile.Services
{
    // Swap MockPatientService for an API-backed implementation once the patient endpoints are available.
    public interface IPatientService
    {
        Task<List<DoctorVm>> GetDoctorsAsync();
        Task<List<string>> GetAvailableSlotsAsync(long doctorId, DateTime date, long? ignoreAppointmentId = null);
        Task<AppointmentVm> BookAppointmentAsync(BookAppointmentVm request);
        Task<AppointmentVm> GetAppointmentAsync(long appointmentId);
        Task CancelAppointmentAsync(long appointmentId);
        Task<AppointmentVm> UpdateAppointmentAsync(long appointmentId, DateTime appointmentDateTime, string? reason);
        Task<List<AppointmentVm>> GetMyAppointmentsAsync();
        Task<List<PrescriptionVm>> GetMyPrescriptionsAsync();
        Task<List<PrescriptionVm>> GetPrescriptionsByAppointmentAsync(long appointmentId);
    }

    public class MockPatientService : IPatientService
    {
        private static readonly TimeSpan OpeningTime = TimeSpan.FromHours(8);
        private static readonly TimeSpan ClosingTime = TimeSpan.FromHours(17);
        private static readonly TimeSpan SlotLength = TimeSpan.FromMinutes(30);

        private readonly List<DoctorVm> _doctors = new()
        {
            new() { Id = 1, FirstName = "Amina", LastName = "Hassan", Specialty = "General Practice" },
            new() { Id = 2, FirstName = "James", LastName = "Otieno", Specialty = "Cardiology" },
            new() { Id = 3, FirstName = "Grace", LastName = "Wambui", Specialty = "Paediatrics" },
            new() { Id = 4, FirstName = "Peter", LastName = "Kamau", Specialty = "Dermatology" },
        };

        private readonly List<AppointmentVm> _appointments;
        private readonly List<PrescriptionVm> _prescriptions;
        private long _nextAppointmentId = 100;

        public MockPatientService()
        {
            var today = DateTime.Today;
            _appointments = new()
            {
                Appt(1, 1, today.AddDays(-60).AddHours(9), "Persistent cough", "COMPLETED", "Chest clear. Prescribed antibiotics."),
                Appt(2, 2, today.AddDays(-35).AddHours(11).AddMinutes(30), "Chest pain follow-up", "COMPLETED", "ECG normal. Review in 3 months."),
                Appt(3, 3, today.AddDays(-20).AddHours(14), "Child vaccination", "COMPLETED", null),
                Appt(4, 4, today.AddDays(-9).AddHours(10), "Skin rash", "CANCELLED", null),
                Appt(5, 1, today.AddDays(-3).AddHours(15), "Headache", "NO_SHOW", null),
                Appt(6, 1, today.AddDays(2).AddHours(9).AddMinutes(30), "Routine check-up", "PENDING", null),
            };

            _prescriptions = new()
            {
                Rx(1, 1, "Amoxicillin", 500, "1 capsule", "3 times a day for 7 days", "Take after meals", 21, today.AddDays(-60), 1),
                Rx(2, 1, "Paracetamol", 500, "2 tablets", "Every 6 hours when needed", "Max 8 tablets a day", 16, today.AddDays(-60), 1),
                Rx(3, 2, "Atorvastatin", 20, "1 tablet", "Once daily at night for 30 days", null, 30, today.AddDays(-35), 2),
                Rx(4, 2, "Aspirin", 75, "1 tablet", "Once daily for 30 days", "Take with food", 30, today.AddDays(-35), 2),
            };
        }

        public async Task<List<DoctorVm>> GetDoctorsAsync()
        {
            await Task.Delay(300);
            return _doctors.ToList();
        }

        public async Task<List<string>> GetAvailableSlotsAsync(long doctorId, DateTime date, long? ignoreAppointmentId = null)
        {
            await Task.Delay(200);
            var taken = _appointments
                .Where(a => a.DoctorId == doctorId && a.AppointmentDateTime.Date == date.Date
                    && a.AppointmentStatus != "CANCELLED" && a.Id != ignoreAppointmentId)
                .Select(a => a.AppointmentDateTime.TimeOfDay)
                .ToHashSet();

            var slots = new List<string>();
            for (var t = OpeningTime; t < ClosingTime; t += SlotLength)
            {
                if (date.Date == DateTime.Today && t <= DateTime.Now.TimeOfDay)
                    continue;
                if (!taken.Contains(t))
                    slots.Add(t.ToString(@"hh\:mm"));
            }
            return slots;
        }

        public async Task<AppointmentVm> BookAppointmentAsync(BookAppointmentVm request)
        {
            await Task.Delay(500);
            var doctor = _doctors.FirstOrDefault(d => d.Id == request.DoctorId)
                ?? throw new InvalidOperationException("Doctor not found.");

            var taken = _appointments.Any(a => a.DoctorId == request.DoctorId
                && a.AppointmentDateTime == request.AppointmentDateTime
                && a.AppointmentStatus != "CANCELLED");
            if (taken)
                throw new InvalidOperationException("That slot has just been taken. Please pick another time.");

            var appointment = new AppointmentVm
            {
                Id = _nextAppointmentId++,
                DoctorId = doctor.Id,
                DoctorFirstName = doctor.FirstName,
                DoctorLastName = doctor.LastName,
                AppointmentDateTime = request.AppointmentDateTime,
                Reason = request.Reason,
                AppointmentStatus = "PENDING"
            };
            _appointments.Add(appointment);
            return appointment;
        }

        public async Task<List<AppointmentVm>> GetMyAppointmentsAsync()
        {
            await Task.Delay(300);
            return _appointments.OrderByDescending(a => a.AppointmentDateTime).ToList();
        }

        public async Task<AppointmentVm> GetAppointmentAsync(long appointmentId)
        {
            await Task.Delay(200);
            var a = Find(appointmentId);
            // A copy, like a fresh API response, so bindings see the change after a reload.
            return new AppointmentVm
            {
                Id = a.Id,
                DoctorId = a.DoctorId,
                DoctorFirstName = a.DoctorFirstName,
                DoctorLastName = a.DoctorLastName,
                AppointmentDateTime = a.AppointmentDateTime,
                Reason = a.Reason,
                AppointmentStatus = a.AppointmentStatus,
                Notes = a.Notes
            };
        }

        public async Task CancelAppointmentAsync(long appointmentId)
        {
            await Task.Delay(400);
            var appointment = Find(appointmentId);
            if (!appointment.CanModify)
                throw new InvalidOperationException("Only pending or waiting appointments can be cancelled.");
            appointment.AppointmentStatus = "CANCELLED";
        }

        public async Task<AppointmentVm> UpdateAppointmentAsync(long appointmentId, DateTime appointmentDateTime, string? reason)
        {
            await Task.Delay(400);
            var appointment = Find(appointmentId);
            if (!appointment.CanModify)
                throw new InvalidOperationException("Only pending or waiting appointments can be edited.");

            var taken = _appointments.Any(a => a.Id != appointmentId && a.DoctorId == appointment.DoctorId
                && a.AppointmentDateTime == appointmentDateTime && a.AppointmentStatus != "CANCELLED");
            if (taken)
                throw new InvalidOperationException("That slot has just been taken. Please pick another time.");

            appointment.AppointmentDateTime = appointmentDateTime;
            appointment.Reason = reason;
            return appointment;
        }

        private AppointmentVm Find(long appointmentId)
            => _appointments.FirstOrDefault(a => a.Id == appointmentId)
                ?? throw new InvalidOperationException("Appointment not found.");

        public async Task<List<PrescriptionVm>> GetMyPrescriptionsAsync()
        {
            await Task.Delay(300);
            return _prescriptions.OrderByDescending(p => p.CreatedOn).ToList();
        }

        public async Task<List<PrescriptionVm>> GetPrescriptionsByAppointmentAsync(long appointmentId)
        {
            await Task.Delay(300);
            return _prescriptions.Where(p => p.AppointmentId == appointmentId).ToList();
        }

        private AppointmentVm Appt(long id, long doctorId, DateTime when, string reason, string status, string? notes)
        {
            var doctor = _doctors.First(d => d.Id == doctorId);
            return new AppointmentVm
            {
                Id = id,
                DoctorId = doctorId,
                DoctorFirstName = doctor.FirstName,
                DoctorLastName = doctor.LastName,
                AppointmentDateTime = when,
                Reason = reason,
                AppointmentStatus = status,
                Notes = notes
            };
        }

        private PrescriptionVm Rx(long id, long appointmentId, string drug, int mg, string dose, string duration,
            string? notes, int quantity, DateTime createdOn, long doctorId)
        {
            var doctor = _doctors.First(d => d.Id == doctorId);
            return new PrescriptionVm
            {
                Id = id,
                AppointmentId = appointmentId,
                DrugName = drug,
                DrugMilligrams = mg,
                Dossage = dose,
                Duration = duration,
                Notes = notes,
                Quantity = quantity,
                CreatedOn = createdOn,
                AppointmentDateTime = _appointments.First(a => a.Id == appointmentId).AppointmentDateTime,
                PrescribedByFirstName = doctor.FirstName,
                PrescribedByLastName = doctor.LastName
            };
        }
    }
}
