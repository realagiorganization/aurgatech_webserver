using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace aurga.Data
{
    [Table("Users")]
    [Index(nameof(UserGUID), IsUnique = true)]
    public class User
    {
        [Key]
        [Column("Id")]
        public long UserId { get; set; }
        [Column("UID")]
        public string UserGUID { get; set; }
        public string Email { get; set; }
        public string? Name { get; set; }
        public string EmailHash { get; set; }
        public string PasswordHash { get; set; }

        [Column("CreatedAt")]
        private long Created { get; set; }
        [Column("VisitedAt")]
        private long Visited { get; set; }

        public bool Activated { get; set; }

        [NotMapped]
        public required DateTime CreatedAt
        {
            get { return DateTimeOffset.FromUnixTimeSeconds(Created).DateTime; }
            set { Created = new DateTimeOffset(value).ToUnixTimeSeconds(); }
        }

        [NotMapped]
        public DateTime VisitedAt
        {
            get { return DateTimeOffset.FromUnixTimeSeconds(Visited).DateTime; }
            set { Visited = new DateTimeOffset(value).ToUnixTimeSeconds(); }
        }
    }
}
