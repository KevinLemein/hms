
using CommunityToolkit.Mvvm.ComponentModel;
using System.ComponentModel;
using System.Diagnostics;
using System.Runtime.CompilerServices;

namespace StallMaster.Mobile.ViewModels
{
    public partial class BaseViewModel : ObservableObject
    {
        protected readonly IToaster Toast ;
        public BaseViewModel(INavigation navigation = null)
        {
         
            Toast = new Toaster();
            // we handle the connectivity services
            _httpClient = new HttpClient();

            // Handle connectivity
            Connectivity.ConnectivityChanged += ConnectivityOnConnectivityChanged;
            IsNotConnected = Connectivity.NetworkAccess != NetworkAccess.Internet;

            //handle logged  in status
            IsNotLoggedIn = false; // Settings.Current.IsNotLoggedIn;
            Navigation = navigation;
        }

        ~BaseViewModel()
        {
            Connectivity.ConnectivityChanged -= ConnectivityOnConnectivityChanged;
        }



        
        private void ConnectivityOnConnectivityChanged(object sender, ConnectivityChangedEventArgs e)
        {
            IsNotConnected = e.NetworkAccess != NetworkAccess.Internet;
        }
      

        public string SearchBarText
        {
            get => _searchBarText;
            set
            {
                _searchBarText = value;
                OnPropertyChanged();
            }
        }

        public bool IsRefreshing
        {
            get { return _isRefreshing; }
            set
            {
                _isRefreshing = value;
                OnPropertyChanged(nameof(IsRefreshing));
            }
        }
        public bool IsConnected
        {
            get => _isConnected;
            set
            {
                _isConnected = value;
                OnPropertyChanged();
            }
        }
        public bool IsNotConnected
        {
            get => _isNotConnected;
            set
            {
               
                _isNotConnected = value;
                IsConnected = !IsNotConnected;
                OnPropertyChanged();
            }
        }

        public bool IsNotLoggedIn
        {
            get => _isNotLoggedIn;
            set
            {
                _isNotLoggedIn = value;
                OnPropertyChanged();
            }
        }

        private bool _isConnected { get; set; }
        private bool _isNotConnected { get; set; }
        private bool _isNotLoggedIn { get; set; }
        public string _searchBarText;
        private bool _isRefreshing = false;

       // public PermissionService _permissionService;
        public readonly HttpClient _httpClient;
        // Navigation property inherited in view models
        public INavigation Navigation { get; set; }

        [ObservableProperty]
        bool isBusy = false;
        [ObservableProperty]
        bool isEdit = false;
        [ObservableProperty]
        private bool _isExpanded;
        
        
        string title = string.Empty;
        public string Title
        {
            get { return title; }
            set { SetProperty(ref title, value); }
        }


        /// <summary>
        /// If <code>true</code>, signals the activity is not busy.
        /// </summary>
        /// <remarks>
        /// This is a useful property to bind a button enabled property to.
        /// </remarks>
        public bool IsNotBusy => !isBusy;


        protected bool SetProperty<T>(ref T backingStore, T value,
            [CallerMemberName] string propertyName = "",
            Action onChanged = null)
        {
            if (EqualityComparer<T>.Default.Equals(backingStore, value))
                return false;

            backingStore = value;
            onChanged?.Invoke();
            OnPropertyChanged(propertyName);
            return true;
        }

        #region INotifyPropertyChanged
        public event PropertyChangedEventHandler PropertyChanged;
        protected void OnPropertyChanged([CallerMemberName] string propertyName = "")
        {
            var changed = PropertyChanged;
            if (changed == null)
                return;

            changed.Invoke(this, new PropertyChangedEventArgs(propertyName));
        }
        #endregion
    }
}
