using MediCare.Mobile.Models;
using Refit;

namespace MediCare.Mobile.Services
{
    public interface IPatientService
    {
        Task<List<DoctorVm>> GetDoctorsAsync();
        Task<List<string>> GetAvailableSlotsAsync(long doctorId, DateTime date, long? ignoreAppointmentId = null);
        Task<AppointmentVm> BookAppointmentAsync(BookAppointmentVm request);
        Task<AppointmentVm> GetAppointmentAsync(long appointmentId);
        Task CancelAppointmentAsync(long appointmentId);
        Task<AppointmentVm> UpdateAppointmentAsync(long appointmentId, DateTime appointmentDateTime, string? reason);
        Task<List<AppointmentVm>> GetMyAppointmentsAsync();
        Task<List<PrescriptionVm>> GetMyPrescriptionsAsync();
        Task<List<PrescriptionVm>> GetPrescriptionsByAppointmentAsync(long appointmentId);
        Task<List<PaymentHistoryItemVm>> GetMyPaymentsAsync();
    }

    // Backed by the backend API. Failures surface as InvalidOperationException carrying
    // a message that is safe to show the user.
    public class ApiPatientService : IPatientService
    {
        private const string WireDateTime = "yyyy-MM-dd'T'HH:mm:ss";

        private readonly IApi _api;

        public ApiPatientService(IApi api)
        {
            _api = api;
        }

        public Task<List<DoctorVm>> GetDoctorsAsync()
            => CallAsync(async () => (await _api.GetDoctorsAsync()).Data ?? new());

        public Task<List<string>> GetAvailableSlotsAsync(long doctorId, DateTime date, long? ignoreAppointmentId = null)
            => CallAsync(async () => (await _api.GetAvailableSlotsAsync(doctorId, date.ToString("yyyy-MM-dd"), ignoreAppointmentId)).Data ?? new());

        public Task<AppointmentVm> BookAppointmentAsync(BookAppointmentVm request)
            => CallAsync(async () => (await _api.BookAppointmentAsync(new BookAppointmentRequestVm
            {
                DoctorId = request.DoctorId,
                AppointmentDateTime = request.AppointmentDateTime.ToString(WireDateTime),
                Reason = request.Reason
            })).Data);

        public Task<AppointmentVm> GetAppointmentAsync(long appointmentId)
            => CallAsync(async () => (await _api.GetAppointmentAsync(appointmentId)).Data);

        public Task CancelAppointmentAsync(long appointmentId)
            => CallAsync(async () => (await _api.UpdateAppointmentStatusAsync(
                appointmentId, new UpdateAppointmentStatusRequestVm { Status = "CANCELLED" })).Data);

        public Task<AppointmentVm> UpdateAppointmentAsync(long appointmentId, DateTime appointmentDateTime, string? reason)
            => CallAsync(async () => (await _api.RescheduleAppointmentAsync(appointmentId, new RescheduleAppointmentRequestVm
            {
                AppointmentDateTime = appointmentDateTime.ToString(WireDateTime),
                Reason = reason
            })).Data);

        public Task<List<AppointmentVm>> GetMyAppointmentsAsync()
            => CallAsync(async () => (await _api.GetMyAppointmentsAsync()).Data ?? new());

        public Task<List<PrescriptionVm>> GetMyPrescriptionsAsync()
            => CallAsync(async () => (await _api.GetMyPrescriptionsAsync()).Data ?? new());

        // The patient's own list carries the drug and doctor names the appointment-scoped endpoint leaves out.
        public async Task<List<PrescriptionVm>> GetPrescriptionsByAppointmentAsync(long appointmentId)
            => (await GetMyPrescriptionsAsync()).Where(p => p.AppointmentId == appointmentId).ToList();

        public async Task<List<PaymentHistoryItemVm>> GetMyPaymentsAsync()
        {
            var bills = await CallAsync(async () => (await _api.GetMyBillsAsync()).Data ?? new());
            return bills
                .SelectMany(b => b.Payments.Select(p => new PaymentHistoryItemVm
                {
                    Id = (int)p.Id,
                    PaymentMode = p.Method,
                    PaymentType = b.Status.Replace('_', ' '),
                    TransactionCode = p.Reference,
                    PaymentFor = $"Bill #{b.Id}",
                    DatePaid = p.PaidAt,
                    Amount = p.Amount
                }))
                .OrderByDescending(p => p.DatePaid)
                .ToList();
        }

        private static async Task<T> CallAsync<T>(Func<Task<T>> call)
        {
            try
            {
                return await call();
            }
            catch (ApiException ex)
            {
                throw await ToUserFacingAsync(ex);
            }
            catch (HttpRequestException)
            {
                throw new InvalidOperationException("Could not reach the server. Check your connection and try again.");
            }
        }

        private static async Task<InvalidOperationException> ToUserFacingAsync(ApiException ex)
        {
            if (ex.StatusCode == System.Net.HttpStatusCode.Unauthorized)
            {
                MainThread.BeginInvokeOnMainThread(App.ShowLogin);
                return new InvalidOperationException("Your session has expired. Please sign in again.");
            }

            ErrorApi? error = null;
            try { error = await ex.GetContentAsAsync<ErrorApi>(); } catch { }

            if (error?.Code == "VALIDATION_FAILED" && error.Errors?.Count > 0)
                return new InvalidOperationException(string.Join("\n", error.Errors.Values));
            return new InvalidOperationException(error?.Message ?? "Something went wrong. Please try again.");
        }
    }
}
