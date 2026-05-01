using Microsoft.EntityFrameworkCore;
using rental_service.Data;
using rental_service.Models;

namespace rental_service.Repositories
{
    public interface IRentalRepository
    {
        Task<Rental> CreateAsync(Rental rental);
        Task<Rental?> GetByIdAsync(Guid id);
        Task<IEnumerable<Rental>> GetAllAsync();
        Task<IEnumerable<Rental>> GetByBorrowerIdAsync(string borrowerId);
        Task<IEnumerable<Rental>> GetByOwnerIdAsync(string ownerId);
        Task<IEnumerable<Rental>> GetByItemIdAsync(string itemId);
        Task<IEnumerable<Rental>> GetByStatusAsync(RentalStatus status);
        Task<Rental?> UpdateAsync(Rental rental);
        Task<bool> DeleteAsync(Guid id);
    }

    public class RentalRepository(RentalDbContext db) : IRentalRepository
    {
        public async Task<Rental> CreateAsync(Rental rental)
        {
            db.Rentals.Add(rental);
            await db.SaveChangesAsync();
            return rental;
        }

        public async Task<Rental?> GetByIdAsync(Guid id) =>
            await db.Rentals.FindAsync(id);

        public async Task<IEnumerable<Rental>> GetAllAsync() =>
            await db.Rentals.OrderByDescending(r => r.CreatedAt).ToListAsync();

        public async Task<IEnumerable<Rental>> GetByBorrowerIdAsync(string borrowerId) =>
            await db.Rentals
                .Where(r => r.BorrowerId == borrowerId)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();

        public async Task<IEnumerable<Rental>> GetByOwnerIdAsync(string ownerId) =>
            await db.Rentals
                .Where(r => r.OwnerId == ownerId)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();

        public async Task<IEnumerable<Rental>> GetByItemIdAsync(string itemId) =>
            await db.Rentals
                .Where(r => r.ItemId == itemId)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();

        public async Task<IEnumerable<Rental>> GetByStatusAsync(RentalStatus status) =>
            await db.Rentals
                .Where(r => r.Status == status)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();

        public async Task<Rental?> UpdateAsync(Rental rental)
        {
            var existing = await db.Rentals.FindAsync(rental.Id);
            if (existing is null) return null;

            db.Entry(existing).CurrentValues.SetValues(rental);
            await db.SaveChangesAsync();
            return existing;
        }

        public async Task<bool> DeleteAsync(Guid id)
        {
            var rental = await db.Rentals.FindAsync(id);
            if (rental is null) return false;

            db.Rentals.Remove(rental);
            await db.SaveChangesAsync();
            return true;
        }
    }
}
