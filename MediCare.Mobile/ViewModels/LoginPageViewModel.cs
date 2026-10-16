using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using MediCare.Mobile.Models;
using Refit;
using StallMaster.Mobile.ViewModels;
using System;
using System.Collections.Generic;
using System.Text;

namespace MediCare.Mobile.ViewModels
{
    public partial class LoginPageViewModel : BaseViewModel
    {
        private readonly IApi _api;
        [ObservableProperty]
        private string email;
        [ObservableProperty]
        private string password;

        public LoginPageViewModel(IApi api) {  

            _api = api;

        }

        [RelayCommand]
        private async Task LoginAsync()
        {
            var errorMsg = "";
            if (string.IsNullOrWhiteSpace(Email))
            {
                errorMsg += "Email is Required.\n";
            }
            if (string.IsNullOrEmpty(Password))
            {
                errorMsg += "Password is Required.\n";
            }
            if (!string.IsNullOrEmpty(errorMsg))
            {
                await Toast.SendToastAsync(errorMsg);
            }
            else
            {
                if (IsBusy)
                    return;
                var vm = new LoginVm
                {
                    Email = Email.Trim(),
                    Password = Password
                };
                try
                {
                    IsBusy = true;
                   // var login = await _api.LoginAsync(vm);
                   // var user = login.Data;
                    //App.Member = new Member
                    //{
                    //    Id = (int)user.Id,
                    //    UserId = user.Id.ToString(),
                    //    FullName = $"{user.FirstName} {user.LastName}".Trim(),
                    //    IDNo = user.Email
                    //};

                    App.Member = new Member
                    {
                        Id = 1,
                        UserId = "ghghghghghg",
                        FullName = "Daniel Mburu",
                        IDNo = "12345"
                    };
                    // App.GoToHome();
                    Application.Current.Windows[0].Page = new AppShell();

                }
                catch (ApiException ex)
                {
                    await Application.Current.Windows[0].Page.DisplayAlertAsync("Sorry!", await GetLoginErrorAsync(ex), "Ok");
                }
                catch (HttpRequestException)
                {
                    await Application.Current.Windows[0].Page.DisplayAlertAsync("Sorry!", "Could not reach the server. Check your connection and try again.", "Ok");
                }
                catch (Exception ex)
                {
                    await Application.Current.Windows[0].Page.DisplayAlertAsync("Sorry!", ex.Message, "Ok");
                }
                finally
                {
                    IsBusy = false;
                }
            }
        }

        private static async Task<string> GetLoginErrorAsync(ApiException ex)
        {
            ErrorApi error = null;
            try { error = await ex.GetContentAsAsync<ErrorApi>(); } catch { }

            if (error?.Code == "INVALID_CREDENTIALS" || ex.StatusCode == System.Net.HttpStatusCode.Unauthorized)
                return "Incorrect email or password.";
            if (error?.Code == "VALIDATION_FAILED" && error.Errors?.Count > 0)
                return string.Join("\n", error.Errors.Values);
            return error?.Message ?? "Login failed. Please try again.";
        }
    }
}
