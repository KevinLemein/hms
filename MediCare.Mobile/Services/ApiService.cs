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

        [Get("/api/appointments")]
        Task<TopUpResponseVm> GetAppointment([Body] TopUpRequestVm vm);

        [Post("/api/appointments")]
        Task<TopUpResponseVm> PostAppointment([Body] TopUpRequestVm vm);

        [Get("/api/Payments/history")]
        Task<List<PaymentHistoryItemVm>> GetPaymentHistoryAsync();

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

        public Task<TopUpResponseVm> GetAppointment(TopUpRequestVm vm) => _api.GetAppointment(vm);
        public Task<TopUpResponseVm> PostAppointment(TopUpRequestVm vm) => _api.PostAppointment(vm);

        public Task<List<PaymentHistoryItemVm>> GetPaymentHistoryAsync() => _api.GetPaymentHistoryAsync();
    }
}
