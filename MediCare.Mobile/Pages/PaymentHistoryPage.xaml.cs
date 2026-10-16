using MediCare.Mobile.PageModels;

namespace MediCare.Mobile.Pages
{
    public partial class PaymentHistoryPage : ContentPage
    {
        public PaymentHistoryPage(PaymentHistoryPageModel model)
        {
            InitializeComponent();
            BindingContext = model;
        }
    }
}
