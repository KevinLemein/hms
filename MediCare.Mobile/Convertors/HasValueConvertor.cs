
using System;
using System.Globalization;

namespace StallMaster.Mobile.Convertors
{
    public class HasValueConvertor : IValueConverter
    {
        public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
        {
            if (value != null)
            {
                return true;
            }
            return false;
        }

        public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
        {
            // Usually unused, but inverse the above logic if needed
            throw new NotImplementedException();
        }
    }
    public class IsNullConvertor : IValueConverter
    {
        public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
        {
            if (value != null)
            {
                return false;
            }
            return true;
        }

        public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
        {
            // Usually unused, but inverse the above logic if needed
            throw new NotImplementedException();
        }
    }
}