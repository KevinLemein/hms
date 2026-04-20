namespace Business.Entities
{
    public class Drug
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public int? ManufacturerId { get; set; }
        public string Milligrams { get; set; }
        public decimal? Cost { get; set; }
    }
}
