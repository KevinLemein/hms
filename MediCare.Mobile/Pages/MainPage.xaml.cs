using MediCare.Mobile.Models;
using MediCare.Mobile.PageModels;

namespace MediCare.Mobile.Pages
{
    public partial class MainPage : ContentPage
    {
        public MainPage(MainPageModel model)
        {
            InitializeComponent();
            BindingContext = model;
        }
    }
}