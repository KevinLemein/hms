using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using MediCare.Mobile.Models;
using System.Collections.ObjectModel;

namespace MediCare.Mobile.PageModels
{
    public partial class PrescriptionsPageModel : ObservableObject
    {
        private readonly IPatientService _patients;
        private readonly ModalErrorHandler _errorHandler;

        public ObservableCollection<AppointmentRow> Appointments { get; } = new();

        [ObservableProperty]
        private bool _isBusy;

        [ObservableProperty]
        private bool _isRefreshing;

        public PrescriptionsPageModel(IPatientService patients, ModalErrorHandler errorHandler)
        {
            _patients = patients;
            _errorHandler = errorHandler;
        }

        [RelayCommand]
        private async Task Refresh()
        {
            await Appearing();
            IsRefreshing = false;
        }

        [RelayCommand]
        private Task OpenAppointment(AppointmentRow row)
            => Shell.Current.GoToAsync($"prescription?appointmentId={row.AppointmentId}");

        [RelayCommand]
        private async Task Appearing()
        {
            if (IsBusy)
                return;

            IsBusy = true;
            try
            {
                var prescriptions = await _patients.GetMyPrescriptionsAsync();
                var counts = prescriptions.GroupBy(p => p.AppointmentId).ToDictionary(g => g.Key, g => g.Count());
                var appointments = await _patients.GetMyAppointmentsAsync();

                Appointments.Clear();
                foreach (var a in appointments.Where(a => counts.ContainsKey(a.Id)).OrderByDescending(a => a.AppointmentDateTime))
                    Appointments.Add(new AppointmentRow(a, counts[a.Id]));
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
