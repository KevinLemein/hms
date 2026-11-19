namespace MediCare.Mobile.Models
{
    public class TopUpRequestVm
    {
        public int Amount { get; set; }
    }

    public class TopUpResponseVm : ErrorApi
    {
        public string? CheckoutRequestId { get; set; }
    }
}
