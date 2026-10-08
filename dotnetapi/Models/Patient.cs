using System.ComponentModel;
using System.ComponentModel.DataAnnotations;


namespace Business.Entities
{
    public class Patient:CreateFields
    {
        public long Id { get; set; }
        public string PatientNumber { get; set; }
        public string Surname { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string IdNumber { get; set; }
        public string PhoneNumber { get; set; }
        public string Email { get; set; }
        public string Occupation { get; set; }
        public string PhotoUrl { get; set; }
        public string NoKName { get; set; }
        public string NoKPhone { get; set; }
        public int? NoKRelationship { get; set; }
        public int? GenderId { get; set; }
        [DisplayFormat(DataFormatString = "{0:yyyy/MM/dd}", ApplyFormatInEditMode = true)]
        public DateTime? DOB { get; set; }

        public string Residence { get; set; }
        public string DisplayName => PatientNumber + " - " + Surname + " " + FirstName;
        [DisplayName("Patient Name")] public string Name => Surname + " " + FirstName + " " + LastName;
        public int? Age
        {
            get
            {
                DateTime now = DateTime.Today;
                int? returnValue = null;
                if (DOB != null)
                {
                    int age = now.Year - ((DateTime) DOB).Year;
                    if (DOB > now.AddYears(-age)) age--;
                    returnValue = age;
                }

                return returnValue;
            }
        }
    }
}
