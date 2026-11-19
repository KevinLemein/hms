using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using MediCare.Mobile.Models;

namespace MediCare.Mobile.PageModels
{
    public partial class MainPageModel : ObservableObject
    {
        private readonly ModalErrorHandler _errorHandler;

        [ObservableProperty]
        private Member _member = new();

        [ObservableProperty]
        private string _today = DateTime.Now.ToString("dddd, MMM d");

        public MainPageModel(ModalErrorHandler errorHandler)
        {
            _errorHandler = errorHandler;
        }

        // Always re-read: this model is a singleton and a different patient may have signed in.
        [RelayCommand]
        private void Appearing()
        {
            Member = App.Member ?? new Member();
        }

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
