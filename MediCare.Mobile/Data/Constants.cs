namespace MediCare.Mobile.Data
{
    public static class Constants
    {
        public const string DatabaseFilename = "MySacco.db3";

        public static string DatabaseFilePath =>
            Path.Combine(FileSystem.AppDataDirectory, DatabaseFilename);

        public static string DatabasePath =>
            $"Data Source={DatabaseFilePath}";

        // Local backend; the Android emulator reaches the host machine via 10.0.2.2.
        public static string BaseApiAddress =>
            DeviceInfo.Platform == DevicePlatform.Android ? "http://10.0.2.2:8080" : "http://localhost:8080";
    }
}