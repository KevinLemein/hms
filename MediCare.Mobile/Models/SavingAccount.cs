using Java.Lang.Reflect;
using System.ComponentModel.DataAnnotations;

namespace MediCare.Mobile.Models
{
    public class SavingAccount
    {
        public int Id { get; set; }

        public int MemberId { get; set; }
        public Member Member { get; set; }
        [DisplayFormat(DataFormatString = "{0:###,###.0##}")]
        public decimal Balance { get; set; }
    }
}