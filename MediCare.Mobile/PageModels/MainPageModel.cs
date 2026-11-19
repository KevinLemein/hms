using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using MediCare.Mobile.Models;

namespace MediCare.Mobile.PageModels
{
    public partial class MainPageModel : ObservableObject
    {
        private readonly IPatientService _patients;
        private readonly ModalErrorHandler _errorHandler;

        [ObservableProperty]
        private Member _member = new();

        [ObservableProperty]
        private string _today = DateTime.Now.ToString("dddd, MMM d");

        [ObservableProperty]
        [NotifyPropertyChangedFor(nameof(HasNextAppointment))]
        private AppointmentVm? _nextAppointment;

        public bool HasNextAppointment => NextAppointment is not null;

        public MainPageModel(IPatientService patients, ModalErrorHandler errorHandler)
        {
            _patients = patients;
            _errorHandler = errorHandler;
        }

        // Always re-read: this model is a singleton and a different patient may have signed in.
        [RelayCommand]
        private async Task Appearing()
        {
            var member = App.Member ?? new Member();
            // Drop the previous patient's appointment immediately when a different patient signs in.
            if (member.IDNo != Member.IDNo)
                NextAppointment = null;
            Member = member;

            // The next-appointment card is optional, so a failed load just hides it instead of interrupting the dashboard.
            try
            {
                var all = await _patients.GetMyAppointmentsAsync();
                NextAppointment = all
                    .Where(a => a.IsUpcoming)
                    .OrderBy(a => a.AppointmentDateTime)
                    .FirstOrDefault();
            }
            catch (Exception)
            {
                NextAppointment = null;
            }
        }

        [RelayCommand]
        private Task OpenNextAppointment()
            => NextAppointment is null
                ? Task.CompletedTask
                : Shell.Current.GoToAsync($"appointment?appointmentId={NextAppointment.Id}");

        [RelayCommand]
        private Task ViewPayments()
            => Shell.Current.GoToAsync("//payments");

        [RelayCommand]
        private Task BookAppointment()
            => Shell.Current.GoToAsync("book");

        [RelayCommand]
        private Task ViewAppointments()
            => Shell.Current.GoToAsync("//appointments");

        [RelayCommand]
        private Task ViewPrescriptions()
            => Shell.Current.GoToAsync("//prescriptions");
    }
}
