using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using MediCare.Mobile.Models;

namespace MediCare.Mobile.PageModels
{
    public partial class AppointmentDetailPageModel : ObservableObject, IQueryAttributable
    {
        private readonly IPatientService _patients;
        private readonly ModalErrorHandler _errorHandler;
        private long _appointmentId;
        private bool _loaded;

        [ObservableProperty]
        [NotifyPropertyChangedFor(nameof(CanModify))]
        private AppointmentVm? _appointment;

        [ObservableProperty]
        [NotifyPropertyChangedFor(nameof(HasPrescriptions))]
        [NotifyPropertyChangedFor(nameof(PrescriptionsText))]
        private int _prescriptionCount;

        [ObservableProperty]
        private bool _isBusy;

        public bool CanModify => Appointment?.CanModify == true;
        public bool HasPrescriptions => PrescriptionCount > 0;
        public string PrescriptionsText => $"View Prescriptions ({PrescriptionCount})";

        public AppointmentDetailPageModel(IPatientService patients, ModalErrorHandler errorHandler)
        {
            _patients = patients;
            _errorHandler = errorHandler;
        }

        public void ApplyQueryAttributes(IDictionary<string, object> query)
        {
            if (query.TryGetValue("appointmentId", out var value) && long.TryParse(value?.ToString(), out var id))
            {
                _appointmentId = id;
                _ = LoadAsync();
            }
        }

        [RelayCommand]
        private async Task Appearing()
        {
            // The first load comes from ApplyQueryAttributes; later appearances refresh after an edit.
            if (_loaded)
                await LoadAsync();
        }

        private async Task LoadAsync()
        {
            if (IsBusy || _appointmentId == 0)
                return;

            IsBusy = true;
            try
            {
                Appointment = await _patients.GetAppointmentAsync(_appointmentId);
                PrescriptionCount = (await _patients.GetPrescriptionsByAppointmentAsync(_appointmentId)).Count;
                _loaded = true;
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

        [RelayCommand]
        private Task Edit()
            => Shell.Current.GoToAsync($"book?appointmentId={_appointmentId}");

        [RelayCommand]
        private async Task Cancel()
        {
            var confirmed = await Shell.Current.DisplayAlertAsync(
                "Cancel appointment", "Do you want to cancel this appointment?", "Yes, cancel", "Keep it");
            if (!confirmed)
                return;

            IsBusy = true;
            try
            {
                await _patients.CancelAppointmentAsync(_appointmentId);
                await AppShell.DisplayToastAsync("Appointment cancelled.");
            }
            catch (InvalidOperationException ex)
            {
                await Shell.Current.DisplayAlertAsync("Sorry!", ex.Message, "Ok");
            }
            catch (Exception e)
            {
                _errorHandler.HandleError(e);
            }
            finally
            {
                IsBusy = false;
            }

            await LoadAsync();
        }

        [RelayCommand]
        private Task ViewPrescriptions()
            => Shell.Current.GoToAsync($"prescription?appointmentId={_appointmentId}");
    }
}
