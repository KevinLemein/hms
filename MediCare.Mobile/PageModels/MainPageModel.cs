using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using MediCare.Mobile.Models;

namespace MediCare.Mobile.PageModels
{
    public partial class MainPageModel : ObservableObject
    {
        private bool _dataLoaded;
        private readonly ModalErrorHandler _errorHandler;
        private readonly SeedDataService _seedDataService;

        [ObservableProperty]
        private Member _member = new();

        [ObservableProperty]
        private string _today = DateTime.Now.ToString("dddd, MMM d");

        public MainPageModel(SeedDataService seedDataService, ModalErrorHandler errorHandler)
        {
            _seedDataService = seedDataService;
            _errorHandler = errorHandler;
        }

        [RelayCommand]
        private async Task Appearing()
        {
            if (_dataLoaded)
                return;

            try
            {
                if (!Preferences.Default.ContainsKey("is_seeded"))
                {
                    await _seedDataService.LoadSeedDataAsync();
                    Preferences.Default.Set("is_seeded", true);
                }

                if (App.Member != null)
                {
                    Member = App.Member;

                    _dataLoaded = true;
                }
               
            }
            catch (Exception e)
            {
                _errorHandler.HandleError(e);
            }
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
