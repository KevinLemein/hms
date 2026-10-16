using MediCare.Mobile.ViewModels;
using Mopups.PreBaked.PopupPages.Login;


namespace MediCare.Mobile.Pages;

public partial class LoginPage : ContentPage
{
	public LoginPage()
	{
		InitializeComponent();
        this.BindingContext = new LoginPageViewModel(ApiService.Instance);
    }
}