using Microsoft.Extensions.DependencyInjection;

using MediCare.Mobile.Models;
using SQLite;
namespace MediCare.Mobile
{
    public partial class App : Application
    {
        public static DataStore Database { get; private set; }
        public static SQLiteAsyncConnection db { get; private set; }
        public static ApplicationUser user;
        public static Member Member;
        public App()
        {
            InitializeComponent();
            Database = new DataStore();
            db = Database._database;
        }
        protected override async void OnStart()
        {
            //  await Task.Delay(1000);
            // Push any locally-saved operations that haven't reached the server yet.

            var page = await CheckStatusAsync();
            if (page.Equals("login"))
                MainPage = new NavigationPage(new LoginPage());
            else
                MainPage = new AppShell();
        }
        public async Task<string> CheckStatusAsync()
        {
            var str = "";
            user = await Database.GetDefaultUser();
            if (user == null || user.IsLoggedIn == false)
                str = "login";
            return str;
        }
        public void GoToHome()
        {
            MainPage = new AppShell();
        }


        protected override Window CreateWindow(IActivationState? activationState)
        {
            return new Window(new AppShell());
        }
    }
}