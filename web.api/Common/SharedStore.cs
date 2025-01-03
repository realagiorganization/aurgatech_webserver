using aurga.Model;

namespace aurga.Common
{
    public static class SharedStore
    {
        public static string MIRROR_URL = "https://aurga.youdomain.com";
        public static string WEBSITE_URL = "https://aurga.youdomain.com";

        public static List<UserInfo> Users { get; set; } = new List<UserInfo>();
        public static List<Invitation> Invitations { get; private set; } = new List<Invitation>();
        public static List<DeviceStatus> AllDevices { get; private set; } = new List<DeviceStatus>();

        static SharedStore() { }
    }
}
