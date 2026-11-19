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

        // Back to the sign-in screen, e.g. after signing out or when the token has expired.
        public static void ShowLogin()
        {
            ApiService.SignOut();
            Member = null;
            if (Current?.Windows.FirstOrDefault() is Window window)
                window.Page = new NavigationPage(new LoginPage());
        }

        protected override Window CreateWindow(IActivationState? activationState)
        {
            // The API needs a token, so every launch starts at sign-in.
            return new Window(new NavigationPage(new LoginPage()));
        }
    }
}