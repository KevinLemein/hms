namespace MediCare.Mobile.Models
{
    public class PaymentHistoryItemVm
    {
        public int Id { get; set; }
        public string? PaymentMode { get; set; }
        public string? PaymentType { get; set; }
        public string? TransactionCode { get; set; }
        public string? PaymentFor { get; set; }
        public DateTime? DatePaid { get; set; }
        public string? ReceivedBy { get; set; }
        public decimal Amount { get; set; }
    }

    public class PaymentRow
    {
        public PaymentRow(PaymentHistoryItemVm item)
        {
            PaymentMode = item.PaymentMode;
            PaymentType = item.PaymentType;
            TransactionCode = item.TransactionCode;
            PaymentFor = item.PaymentFor;
            DatePaid = item.DatePaid?.ToString("dd/MM/yyyy");
            ReceivedBy = item.ReceivedBy;
            Amount = item.Amount.ToString("N2");
        }

        public string? PaymentMode { get; }
        public string? PaymentType { get; }
        public string? TransactionCode { get; }
        public string? PaymentFor { get; }
        public string? DatePaid { get; }
        public string? ReceivedBy { get; }
        public string Amount { get; }
    }
}
