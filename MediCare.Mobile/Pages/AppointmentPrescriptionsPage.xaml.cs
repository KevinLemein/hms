namespace MediCare.Mobile.Pages
{
    public partial class AppointmentPrescriptionsPage : ContentPage
    {
        public AppointmentPrescriptionsPage(AppointmentPrescriptionsPageModel model)
        {
            InitializeComponent();
            BindingContext = model;
        }
    }
}
