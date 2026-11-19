namespace MediCare.Mobile.Pages
{
    public partial class AppointmentDetailPage : ContentPage
    {
        public AppointmentDetailPage(AppointmentDetailPageModel model)
        {
            InitializeComponent();
            BindingContext = model;
        }
    }
}
