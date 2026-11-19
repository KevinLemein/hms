using MediCare.Mobile.Models;

namespace MediCare.Mobile.Pages
{
    public partial class PrescriptionsPage : ContentPage
    {
        public PrescriptionsPage(PrescriptionsPageModel model)
        {
            InitializeComponent();
            BindingContext = model;
        }

        private void OnItemSelected(object? sender, SelectionChangedEventArgs e)
        {
            if (e.CurrentSelection.FirstOrDefault() is not AppointmentRow row)
                return;

            // Clear the selection so the same card can be tapped again.
            AppointmentsList.SelectedItem = null;

            if (BindingContext is PrescriptionsPageModel model)
                model.OpenAppointmentCommand.Execute(row);
        }
    }
}
