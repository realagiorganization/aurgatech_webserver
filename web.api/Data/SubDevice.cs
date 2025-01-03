using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace aurga.Data
{
    [Table("SubDevice")]
    public class SubDevice
    {
        [Key]
        [Column(Order = 1)]
        public required long SubAccountId { get; set; }
        [Key]
        [Column(Order = 2)]
        public required long DeviceId { get; set; }

        public required string Name { get; set; }

        [Column("CreatedAt")]
        private long Created { get; set; }
        [NotMapped]
        public required DateTime CreatedAt
        {
            get { return DateTimeOffset.FromUnixTimeSeconds(Created).DateTime; }
            set { Created = new DateTimeOffset(value).ToUnixTimeSeconds(); }
        }
        public required DeviceState Status { get; set; }
    }
}
