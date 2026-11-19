using MediCare.Mobile.Models;

namespace MediCare.Mobile.Pages
{
    public partial class AppointmentsPage : ContentPage
    {
        public AppointmentsPage(AppointmentsPageModel model)
        {
            InitializeComponent();
            BindingContext = model;
        }

        private void OnItemSelected(object? sender, SelectionChangedEventArgs e)
        {
            if (e.CurrentSelection.FirstOrDefault() is not AppointmentVm appointment)
                return;

            // Clear the selection so the same card can be tapped again.
            AppointmentsList.SelectedItem = null;

            if (BindingContext is AppointmentsPageModel model)
                model.OpenAppointmentCommand.Execute(appointment);
        }
    }
}
