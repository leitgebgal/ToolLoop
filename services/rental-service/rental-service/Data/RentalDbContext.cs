using Microsoft.EntityFrameworkCore;
using rental_service.Models;

namespace rental_service.Data
{
    public class RentalDbContext(DbContextOptions<RentalDbContext> options) : DbContext(options)
    {
        public DbSet<Rental> Rentals => Set<Rental>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Rental>(entity =>
            {
                entity.HasKey(r => r.Id);
                entity.Property(r => r.Status).HasConversion<string>();
                entity.HasIndex(r => r.BorrowerId);
                entity.HasIndex(r => r.OwnerId);
                entity.HasIndex(r => r.ItemId);
            });
        }
    }
}
