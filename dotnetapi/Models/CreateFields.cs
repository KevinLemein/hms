using System.Text.Json.Serialization;

namespace Business.Entities;

public class CreateFields
{
    public DateTime CreatedOn { get; set; }
    public long CreatedById { get; set; }
    [JsonIgnore]
    public User CreatedBy { get; set; }
}