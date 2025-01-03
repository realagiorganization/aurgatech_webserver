using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace aurga.Data
{
    public enum SubAccountStatus
    {
        Pending = 0,
        Accepted = 1,
        Approved = 2,
        Disabled = 3,
        Deleted = 4,
        MAX = 5,
    }

    [Table("SubAccount")]
    public class SubAccount
    {
        [Key]
        public long SubAccountId { get; set; }
        public required long AccountId { get; set; }

        public required long ParentAccountId { get; set; }

        public required string Name { get; set; }
        public required string Email { get; set; }

        [Column("CreatedAt")]
        private long Created { get; set; }
        [NotMapped]
        public required DateTime CreatedAt
        {
            get { return DateTimeOffset.FromUnixTimeSeconds(Created).DateTime; }
            set { Created = new DateTimeOffset(value).ToUnixTimeSeconds(); }
        }
        public required SubAccountStatus Status { get; set; }
    }
}
