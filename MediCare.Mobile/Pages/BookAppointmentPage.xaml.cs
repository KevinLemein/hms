namespace MediCare.Mobile.Pages
{
    public partial class BookAppointmentPage : ContentPage
    {
        public BookAppointmentPage(BookAppointmentPageModel model)
        {
            InitializeComponent();
            BindingContext = model;
        }
    }
}
