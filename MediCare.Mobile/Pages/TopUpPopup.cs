using Mopups.Pages;
using Mopups.Services;

namespace MediCare.Mobile.Pages
{
    public class TopUpPopup : PopupPage
    {
        private readonly Func<int, Task<string?>> _submit;
        private readonly Entry _amountEntry;
        private readonly Button _payButton;
        private readonly Button _cancelButton;
        private readonly ActivityIndicator _spinner;
        private readonly Label _errorLabel;
        private readonly TaskCompletionSource<bool> _result = new();
        private bool _busy;

        // submit returns an error message, or null when the API call succeeded.
        public TopUpPopup(string currency, Func<int, Task<string?>> submit)
        {
            _submit = submit;
            CloseWhenBackgroundIsClicked = false;

            _amountEntry = new Entry
            {
                Placeholder = "e.g. 500",
                Keyboard = Keyboard.Numeric,
                MaxLength = 6
            };

            _errorLabel = new Label { TextColor = Colors.Red, FontSize = 13, IsVisible = false };

            _spinner = new ActivityIndicator
            {
                IsRunning = false,
                IsVisible = false,
                HeightRequest = 32,
                HorizontalOptions = LayoutOptions.Center
            };

            _cancelButton = new Button { Text = "Cancel", BackgroundColor = Colors.Transparent, TextColor = Colors.Gray };
            _cancelButton.Clicked += async (_, _) => await CloseAsync(false);

            _payButton = new Button { Text = "Pay" };
            _payButton.Clicked += OnPayClicked;

            var buttons = new Grid
            {
                ColumnDefinitions = { new ColumnDefinition(GridLength.Star), new ColumnDefinition(GridLength.Star) },
                ColumnSpacing = 8
            };
            buttons.Add(_cancelButton, 0);
            buttons.Add(_payButton, 1);

            Content = new Border
            {
                StrokeShape = new Microsoft.Maui.Controls.Shapes.RoundRectangle { CornerRadius = 16 },
                StrokeThickness = 0,
                BackgroundColor = Application.Current?.RequestedTheme == AppTheme.Dark ? Color.FromArgb("#2B2B2B") : Colors.White,
                HorizontalOptions = LayoutOptions.Center,
                VerticalOptions = LayoutOptions.Center,
                WidthRequest = 320,
                Padding = 20,
                Content = new VerticalStackLayout
                {
                    Spacing = 12,
                    Children =
                    {
                        new Label { Text = "Top Up", FontSize = 20, FontAttributes = FontAttributes.Bold },
                        new Label { Text = $"Enter amount ({currency}) to deposit via M-Pesa" },
                        _amountEntry,
                        _errorLabel,
                        _spinner,
                        buttons
                    }
                }
            };
        }

        public async Task<bool> ShowAsync()
        {
            await MopupService.Instance.PushAsync(this);
            return await _result.Task;
        }

        protected override bool OnBackButtonPressed() => _busy || base.OnBackButtonPressed();

        private async Task CloseAsync(bool succeeded)
        {
            _result.TrySetResult(succeeded);
            await MopupService.Instance.PopAsync();
        }

        private async void OnPayClicked(object? sender, EventArgs e)
        {
            if (!int.TryParse(_amountEntry.Text?.Trim(), out var amount) || amount < 1)
            {
                ShowError("Enter a valid whole amount.");
                return;
            }

            SetBusy(true);
            string? error;
            try
            {
                error = await _submit(amount);
            }
            catch (Exception)
            {
                error = "Top up failed. Please try again.";
            }

            if (error is null)
            {
                await CloseAsync(true);
                return;
            }

            SetBusy(false);
            ShowError(error);
        }

        private void SetBusy(bool busy)
        {
            _busy = busy;
            _errorLabel.IsVisible = false;
            _spinner.IsVisible = busy;
            _spinner.IsRunning = busy;
            _amountEntry.IsEnabled = !busy;
            _payButton.IsEnabled = !busy;
            _cancelButton.IsEnabled = !busy;
        }

        private void ShowError(string message)
        {
            _errorLabel.Text = message;
            _errorLabel.IsVisible = true;
        }
    }
}
