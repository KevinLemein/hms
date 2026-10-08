using System.ComponentModel;

namespace Business.Entities
{
    public class Gender
    {
        public int Id { get; set; }
        [DisplayName("Gender")]
        public string Name { get; set; }
    }
}
