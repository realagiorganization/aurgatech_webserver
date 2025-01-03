using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace aurga.Data
{
    public enum DeviceState
    {
        Normal = 1,
        Deleted = 2,
    }

    [Table("Devices")]
    [Index(nameof(DeviceGUID), IsUnique = true)]
    public class Device
    {
        [Key]
        [Column("Id")]
        public long DeviceId { get; set; }
        /// <summary>
        /// Device UID
        /// </summary>
        [Column("UID")]
        public required string DeviceGUID { get; set; }
        /// <summary>
        /// Account UID
        /// </summary>
        [Column("AUID")]
        public string UserGUID { get; set; }
        public string? Name { get; set; }
        public int Model { get; set; }
        public required DeviceState Status { get; set; }
        private long Registered { get; set; }

        [NotMapped]
        public required DateTime RegisteredAt
        {
            get { return DateTimeOffset.FromUnixTimeSeconds(Registered).DateTime; }
            set { Registered = new DateTimeOffset(value).ToUnixTimeSeconds(); }
        }
    }
}
