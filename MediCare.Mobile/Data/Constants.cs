namespace MediCare.Mobile.Data
{
    public static class Constants
    {
        public const string DatabaseFilename = "MySacco.db3";

        public static string DatabaseFilePath =>
            Path.Combine(FileSystem.AppDataDirectory, DatabaseFilename);

        public static string DatabasePath =>
            $"Data Source={DatabaseFilePath}";

        // Local backend. The Android emulator reaches the host via 10.0.2.2; a physical
        // Android device over USB needs `adb reverse tcp:8080 tcp:8080` so localhost works.
        public static string BaseApiAddress =>
            DeviceInfo.Platform == DevicePlatform.Android && DeviceInfo.DeviceType == DeviceType.Virtual
                ? "http://10.0.2.2:8080"
                : "http://localhost:8080";
    }
}