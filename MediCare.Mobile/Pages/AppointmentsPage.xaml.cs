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
            if (e.CurrentSelection.FirstOrDefault() is AppointmentVm appointment && BindingContext is AppointmentsPageModel model)
                model.OpenAppointmentCommand.Execute(appointment);
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
