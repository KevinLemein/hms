using CommunityToolkit.Mvvm.ComponentModel;
using MediCare.Mobile.Models;
using System.Collections.ObjectModel;

namespace MediCare.Mobile.PageModels
{
    public partial class AppointmentPrescriptionsPageModel : ObservableObject, IQueryAttributable
    {
        private readonly IPatientService _patients;
        private readonly ModalErrorHandler _errorHandler;

        public ObservableCollection<PrescriptionVm> Prescriptions { get; } = new();

        [ObservableProperty]
        private bool _isBusy;

        [ObservableProperty]
        private string _header = "";

        public AppointmentPrescriptionsPageModel(IPatientService patients, ModalErrorHandler errorHandler)
        {
            _patients = patients;
            _errorHandler = errorHandler;
        }

        public void ApplyQueryAttributes(IDictionary<string, object> query)
        {
            if (query.TryGetValue("appointmentId", out var value) && long.TryParse(value?.ToString(), out var id))
                _ = LoadAsync(id);
        }

        private async Task LoadAsync(long appointmentId)
        {
            IsBusy = true;
            try
            {
                var items = await _patients.GetPrescriptionsByAppointmentAsync(appointmentId);
                Prescriptions.Clear();
                foreach (var p in items)
                    Prescriptions.Add(p);

                var first = items.FirstOrDefault();
                Header = first is null
                    ? "No prescriptions for this appointment."
                    : $"{first.DoctorName} - {first.AppointmentDateTime:dd MMM yyyy HH:mm}";
            }
            catch (Exception e)
            {
                _errorHandler.HandleError(e);
            }
            finally
            {
                IsBusy = false;
            }
        }
    }
}
