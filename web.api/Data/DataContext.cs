using Microsoft.EntityFrameworkCore;

namespace aurga.Data
{
    public class DataContext : DbContext
    {
        private readonly IConfiguration _configuration;

        public DataContext(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public DbSet<User> Users { get; set; }
        public DbSet<Device> Devices { get; set; }

        public DbSet<SubAccount> SubAccounts { get; set; }
        public DbSet<SubDevice> SubDevices { get; set; }

        protected override void OnConfiguring(DbContextOptionsBuilder options)
            => options.UseSqlite(_configuration.GetConnectionString("DefaultConnection"))
            .UseLoggerFactory(LoggerFactory.Create(builder => builder.AddConsole()));

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            Console.WriteLine("OnModelCreating");
            modelBuilder.Entity<User>().Property<long>("Visited");
            modelBuilder.Entity<User>().Property<long>("Created");
            modelBuilder.Entity<Device>().Property<long>("Registered");

            modelBuilder.Entity<SubAccount>().Property<long>("Created");
            modelBuilder.Entity<SubDevice>().Property<long>("Created");

            modelBuilder.Entity<User>().ToTable("Users");
            modelBuilder.Entity<Device>().ToTable("Devices");
            modelBuilder.Entity<Device>().HasIndex(o => new { o.DeviceGUID}).IsUnique();
            modelBuilder.Entity<Device>().HasIndex(o => new { o.DeviceGUID, o.UserGUID }).IsUnique();
            modelBuilder.Entity<SubDevice>().HasKey(o => new { o.DeviceId, o.SubAccountId });
        }
    }
}
