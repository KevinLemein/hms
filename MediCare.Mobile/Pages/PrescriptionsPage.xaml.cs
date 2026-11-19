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
            if (e.CurrentSelection.FirstOrDefault() is AppointmentRow row && BindingContext is PrescriptionsPageModel model)
                model.OpenAppointmentCommand.Execute(row);
        }

        protected override void OnAppearing()
        {
            base.OnAppearing();
            // Toggling the mode clears the grid's selection so the same row can be tapped again.
            AppointmentsGrid.SelectionMode = SelectionMode.None;
            AppointmentsGrid.SelectionMode = SelectionMode.Single;
        }
    }
}
