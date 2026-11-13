using MediCare.Mobile.Models;
using Newtonsoft.Json;
using Newtonsoft.Json.Serialization;
using Refit;
using System;
using System.Collections.Generic;
using System.Net;
using System.Text;

namespace MediCare.Mobile.Services
{

    public interface IApi
    {

        [Post("/api/auth/login")]
        Task<Models.ApiResponse<AuthResponseVm>> LoginAsync([Body] LoginVm vm);

        [Get("/api/appointments/doctors")]
        Task<Models.ApiResponse<List<DoctorVm>>> GetDoctorsAsync();

        [Get("/api/appointments/doctor/{doctorId}/slots")]
        Task<Models.ApiResponse<List<string>>> GetAvailableSlotsAsync(long doctorId, [Query] string date, [Query] long? ignoreAppointmentId);

        [Post("/api/appointments")]
        Task<Models.ApiResponse<AppointmentVm>> BookAppointmentAsync([Body] BookAppointmentRequestVm vm);

        [Get("/api/appointments/{id}")]
        Task<Models.ApiResponse<AppointmentVm>> GetAppointmentAsync(long id);

        [Put("/api/appointments/{id}")]
        Task<Models.ApiResponse<AppointmentVm>> RescheduleAppointmentAsync(long id, [Body] RescheduleAppointmentRequestVm vm);

        [Patch("/api/appointments/{id}/status")]
        Task<Models.ApiResponse<AppointmentVm>> UpdateAppointmentStatusAsync(long id, [Body] UpdateAppointmentStatusRequestVm vm);

        [Get("/api/patients/me/appointments")]
        Task<Models.ApiResponse<List<AppointmentVm>>> GetMyAppointmentsAsync();

        [Get("/api/patients/me/prescriptions")]
        Task<Models.ApiResponse<List<PrescriptionVm>>> GetMyPrescriptionsAsync();

        [Get("/api/patients/me/bills")]
        Task<Models.ApiResponse<List<BillVm>>> GetMyBillsAsync();

    }

    // Refit ignores AuthorizationHeaderValueGetter when given a pre-built HttpClient.
    internal class BearerTokenHandler : DelegatingHandler
    {
        public BearerTokenHandler(HttpMessageHandler inner) : base(inner) { }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            if (!string.IsNullOrEmpty(ApiService.AccessToken))
            {
                request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", ApiService.AccessToken);
            }
            return base.SendAsync(request, cancellationToken);
        }
    }
    public class ApiService : IApi
    {
        private static ApiService _instance;
        public static ApiService Instance = _instance ?? (_instance = new ApiService());
        private readonly IApi _api;

        public static string? AccessToken { get; private set; }

        public static void SignOut() => AccessToken = null;

        public ApiService(string baseUrl = null)
        {
            var url = baseUrl == null ? Constants.BaseApiAddress : baseUrl;

            var httpClientHandler = new HttpClientHandler
            {
                ServerCertificateCustomValidationCallback = (message, certificate, chain, sslPolicyErrors) => true
            };

            ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls13 | SecurityProtocolType.Tls12 | SecurityProtocolType.Tls11 | SecurityProtocolType.Tls;

            _api = RestService.For<IApi>(

                new HttpClient(new BearerTokenHandler(httpClientHandler))
                {
                    BaseAddress = new Uri(url)
                },
                new RefitSettings
                {
                    ContentSerializer = new NewtonsoftJsonContentSerializer(
                    new JsonSerializerSettings
                    {
                        ContractResolver = new CamelCasePropertyNamesContractResolver()
                    })
                });
        }


        public async Task<Models.ApiResponse<AuthResponseVm>> LoginAsync(LoginVm vm)
        {
            var response = await _api.LoginAsync(vm);
            AccessToken = response?.Data?.Token;
            return response;
        }

        public Task<Models.ApiResponse<List<DoctorVm>>> GetDoctorsAsync() => _api.GetDoctorsAsync();
        public Task<Models.ApiResponse<List<string>>> GetAvailableSlotsAsync(long doctorId, string date, long? ignoreAppointmentId)
            => _api.GetAvailableSlotsAsync(doctorId, date, ignoreAppointmentId);
        public Task<Models.ApiResponse<AppointmentVm>> BookAppointmentAsync(BookAppointmentRequestVm vm) => _api.BookAppointmentAsync(vm);
        public Task<Models.ApiResponse<AppointmentVm>> GetAppointmentAsync(long id) => _api.GetAppointmentAsync(id);
        public Task<Models.ApiResponse<AppointmentVm>> RescheduleAppointmentAsync(long id, RescheduleAppointmentRequestVm vm)
            => _api.RescheduleAppointmentAsync(id, vm);
        public Task<Models.ApiResponse<AppointmentVm>> UpdateAppointmentStatusAsync(long id, UpdateAppointmentStatusRequestVm vm)
            => _api.UpdateAppointmentStatusAsync(id, vm);
        public Task<Models.ApiResponse<List<AppointmentVm>>> GetMyAppointmentsAsync() => _api.GetMyAppointmentsAsync();
        public Task<Models.ApiResponse<List<PrescriptionVm>>> GetMyPrescriptionsAsync() => _api.GetMyPrescriptionsAsync();
        public Task<Models.ApiResponse<List<BillVm>>> GetMyBillsAsync() => _api.GetMyBillsAsync();
    }
}
