using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using MediCare.Mobile.Models;
using System.Collections.ObjectModel;

namespace MediCare.Mobile.PageModels
{
    public partial class AppointmentsPageModel : ObservableObject
    {
        private readonly IPatientService _patients;
        private readonly ModalErrorHandler _errorHandler;

        public ObservableCollection<AppointmentVm> Appointments { get; } = new();

        [ObservableProperty]
        private bool _isBusy;

        [ObservableProperty]
        private bool _isRefreshing;

        public AppointmentsPageModel(IPatientService patients, ModalErrorHandler errorHandler)
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
        private async Task Appearing()
        {
            if (IsBusy)
                return;

            IsBusy = true;
            try
            {
                var all = await _patients.GetMyAppointmentsAsync();

                Appointments.Clear();
                foreach (var a in all.Where(a => a.IsUpcoming).OrderBy(a => a.AppointmentDateTime))
                    Appointments.Add(a);
                foreach (var a in all.Where(a => !a.IsUpcoming).OrderByDescending(a => a.AppointmentDateTime))
                    Appointments.Add(a);
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
        private Task OpenAppointment(AppointmentVm appointment)
            => Shell.Current.GoToAsync($"appointment?appointmentId={appointment.Id}");

        [RelayCommand]
        private Task Book() => Shell.Current.GoToAsync("book");
    }
}
