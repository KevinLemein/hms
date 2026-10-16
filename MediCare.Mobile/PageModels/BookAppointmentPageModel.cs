using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using MediCare.Mobile.Models;
using System.Collections.ObjectModel;

namespace MediCare.Mobile.PageModels
{
    public partial class BookAppointmentPageModel : ObservableObject, IQueryAttributable
    {
        private readonly IPatientService _patients;
        private readonly ModalErrorHandler _errorHandler;
        private long? _editingId;
        private bool _suppressSlots;
        private Task? _doctorsTask;

        public ObservableCollection<DoctorVm> Doctors { get; } = new();
        public ObservableCollection<string> Slots { get; } = new();

        public DateTime MinDate => DateTime.Today;
        public DateTime MaxDate => DateTime.Today.AddMonths(3);

        [ObservableProperty]
        private DoctorVm? _selectedDoctor;

        [ObservableProperty]
        private DateTime _selectedDate = DateTime.Today.AddDays(1);

        [ObservableProperty]
        private string? _selectedSlot;

        [ObservableProperty]
        private string? _reason;

        [ObservableProperty]
        private bool _isBusy;

        [ObservableProperty]
        private string? _errorMessage;

        [ObservableProperty]
        private string _title = "Book Appointment";

        [ObservableProperty]
        private string _submitText = "Book Appointment";

        [ObservableProperty]
        private bool _canChangeDoctor = true;

        public BookAppointmentPageModel(IPatientService patients, ModalErrorHandler errorHandler)
        {
            _patients = patients;
            _errorHandler = errorHandler;
        }

        partial void OnSelectedDoctorChanged(DoctorVm? value)
        {
            if (!_suppressSlots)
                _ = LoadSlotsAsync();
        }

        partial void OnSelectedDateChanged(DateTime value)
        {
            if (!_suppressSlots)
                _ = LoadSlotsAsync();
        }

        [RelayCommand]
        private Task Appearing() => EnsureDoctorsAsync();

        private Task EnsureDoctorsAsync() => _doctorsTask ??= LoadDoctorsAsync();

        private async Task LoadDoctorsAsync()
        {
            try
            {
                foreach (var d in await _patients.GetDoctorsAsync())
                    Doctors.Add(d);
            }
            catch (Exception e)
            {
                _doctorsTask = null;
                _errorHandler.HandleError(e);
            }
        }

        public void ApplyQueryAttributes(IDictionary<string, object> query)
        {
            if (query.TryGetValue("appointmentId", out var value) && long.TryParse(value?.ToString(), out var id))
                _ = LoadForEditAsync(id);
        }

        private async Task LoadForEditAsync(long id)
        {
            try
            {
                await EnsureDoctorsAsync();
                var appointment = await _patients.GetAppointmentAsync(id);

                _editingId = id;
                Title = "Edit Appointment";
                SubmitText = "Save Changes";
                CanChangeDoctor = false;

                _suppressSlots = true;
                SelectedDoctor = Doctors.FirstOrDefault(d => d.Id == appointment.DoctorId);
                SelectedDate = appointment.AppointmentDateTime.Date;
                Reason = appointment.Reason;
                _suppressSlots = false;

                await LoadSlotsAsync();
                var current = appointment.AppointmentDateTime.ToString("HH:mm");
                if (Slots.Contains(current))
                    SelectedSlot = current;
            }
            catch (Exception e)
            {
                _errorHandler.HandleError(e);
            }
        }

        private async Task LoadSlotsAsync()
        {
            Slots.Clear();
            SelectedSlot = null;
            if (SelectedDoctor is null)
                return;

            try
            {
                foreach (var s in await _patients.GetAvailableSlotsAsync(SelectedDoctor.Id, SelectedDate, _editingId))
                    Slots.Add(s);
            }
            catch (Exception e)
            {
                _errorHandler.HandleError(e);
            }
        }

        [RelayCommand]
        private async Task Book()
        {
            if (IsBusy)
                return;

            if (SelectedDoctor is null)
            {
                ErrorMessage = "Please select a doctor.";
                return;
            }
            if (SelectedSlot is null)
            {
                ErrorMessage = "Please select a time slot.";
                return;
            }

            IsBusy = true;
            ErrorMessage = null;
            try
            {
                var when = SelectedDate.Date + TimeSpan.Parse(SelectedSlot);
                if (_editingId is long editId)
                {
                    await _patients.UpdateAppointmentAsync(editId, when, Reason?.Trim());
                    await AppShell.DisplayToastAsync("Appointment updated.");
                }
                else
                {
                    await _patients.BookAppointmentAsync(new BookAppointmentVm
                    {
                        PatientId = App.Member?.Id ?? 0,
                        DoctorId = SelectedDoctor.Id,
                        AppointmentDateTime = when,
                        Reason = Reason?.Trim()
                    });
                    await AppShell.DisplayToastAsync("Appointment booked.");
                }

                await Shell.Current.GoToAsync("..");
            }
            catch (InvalidOperationException ex)
            {
                ErrorMessage = ex.Message;
                await LoadSlotsAsync();
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
