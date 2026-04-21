using AutoMapper;
using Business.Entities;

namespace MediCare.AutoMapper;

public class AutomapperProfile : Profile
{
    public AutomapperProfile()
    {
        CreateMap<ApplicationUser, UserVm>().ReverseMap();
    }
}