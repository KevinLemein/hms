using CommunityToolkit.Mvvm.Input;
using MediCare.Mobile.Models;

namespace MediCare.Mobile.PageModels
{
    public interface IProjectTaskPageModel
    {
        IAsyncRelayCommand<ProjectTask> NavigateToTaskCommand { get; }
        bool IsBusy { get; }
    }
}