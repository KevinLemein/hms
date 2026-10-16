using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using MediCare.Mobile.Models;
using MediCare.Mobile.Services;
using Refit;
using System.Collections.ObjectModel;

namespace MediCare.Mobile.PageModels
{
    public partial class PaymentHistoryPageModel : ObservableObject
    {
        private readonly IApi _api;
        private readonly ModalErrorHandler _errorHandler;

        public ObservableCollection<PaymentRow> Payments { get; } = new();

        [ObservableProperty]
        private bool _isBusy;

        [ObservableProperty]
        private string _total = "0.00";

        [ObservableProperty]
        private string? _errorMessage;

        public PaymentHistoryPageModel(IApi api, ModalErrorHandler errorHandler)
        {
            _api = api;
            _errorHandler = errorHandler;
        }

        [RelayCommand]
        private async Task Appearing()
        {
            if (IsBusy)
                return;

            IsBusy = true;
            ErrorMessage = null;
            try
            {
                var items = await _api.GetPaymentHistoryAsync();

                Payments.Clear();
                foreach (var item in items)
                {
                    Payments.Add(new PaymentRow(item));
                }
                Total = items.Sum(i => i.Amount).ToString("N2");
            }
            catch (ApiException ex)
            {
                var error = await ex.GetContentAsAsync<ErrorApi>();
                ErrorMessage =ex.Message;
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
