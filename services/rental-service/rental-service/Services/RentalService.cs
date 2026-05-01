using rental_service.DTOs;
using rental_service.Messaging;
using rental_service.Models;
using rental_service.Repositories;
using System.Reactive.Linq;
using System.Reactive.Subjects;

namespace rental_service.Services
{
    public interface IRentalService
    {
        Task<RentalResponse> CreateRentalAsync(CreateRentalRequest request);
        Task<RentalResponse?> GetRentalByIdAsync(Guid id);
        Task<IEnumerable<RentalResponse>> GetAllRentalsAsync();
        Task<IEnumerable<RentalResponse>> GetRentalsByBorrowerAsync(string borrowerId);
        Task<IEnumerable<RentalResponse>> GetRentalsByOwnerAsync(string ownerId);
        Task<IEnumerable<RentalResponse>> GetRentalsByItemAsync(string itemId);
        Task<IEnumerable<RentalResponse>> GetRentalsByStatusAsync(RentalStatus status);
        Task<RentalResponse?> UpdateRentalStatusAsync(Guid id, UpdateRentalStatusRequest request);
        Task<bool> CancelRentalAsync(Guid id, string requesterId);
    }

    public class RentalService : IRentalService
    {
        private readonly IRentalRepository _repository;
        private readonly IMessagePublisher _publisher;
        private readonly IRentalStreamService _stream;
        private readonly ILogger<RentalService> _logger;

        public RentalService(
            IRentalRepository repository,
            IMessagePublisher publisher,
            IRentalStreamService stream,
            ILogger<RentalService> logger)
        {
            _repository = repository;
            _publisher = publisher;
            _stream = stream;
            _logger = logger;
        }

        public async Task<RentalResponse> CreateRentalAsync(CreateRentalRequest request)
        {
            _logger.LogInformation(
                "Creating rental request: borrower={BorrowerId} item={ItemId}",
                request.BorrowerId, request.ItemId);

            if (request.StartDate >= request.EndDate)
                throw new ArgumentException("EndDate must be after StartDate");

            if (request.StartDate < DateTime.UtcNow.Date)
                throw new ArgumentException("StartDate cannot be in the past");

            var rental = new Rental
            {
                ItemId = request.ItemId,
                BorrowerId = request.BorrowerId,
                OwnerId = request.OwnerId,
                StartDate = request.StartDate,
                EndDate = request.EndDate,
                Message = request.Message,
                Status = RentalStatus.Pending
            };

            var created = await _repository.CreateAsync(rental);
            await _publisher.PublishRentalEventAsync("rental.created", created);

            var response = created.ToResponse();
            _stream.Publish(response);

            _logger.LogInformation("Rental created with Id={Id}", created.Id);
            return response;
        }

        public async Task<RentalResponse?> GetRentalByIdAsync(Guid id)
        {
            _logger.LogInformation("Fetching rental Id={Id}", id);
            var rental = await _repository.GetByIdAsync(id);
            return rental?.ToResponse();
        }

        public async Task<IEnumerable<RentalResponse>> GetAllRentalsAsync()
        {
            _logger.LogInformation("Fetching all rentals");
            var rentals = await _repository.GetAllAsync();
            return rentals.Select(r => r.ToResponse());
        }

        public async Task<IEnumerable<RentalResponse>> GetRentalsByBorrowerAsync(string borrowerId)
        {
            _logger.LogInformation("Fetching rentals for borrower={BorrowerId}", borrowerId);
            var rentals = await _repository.GetByBorrowerIdAsync(borrowerId);
            return rentals.Select(r => r.ToResponse());
        }

        public async Task<IEnumerable<RentalResponse>> GetRentalsByOwnerAsync(string ownerId)
        {
            _logger.LogInformation("Fetching rentals for owner={OwnerId}", ownerId);
            var rentals = await _repository.GetByOwnerIdAsync(ownerId);
            return rentals.Select(r => r.ToResponse());
        }

        public async Task<IEnumerable<RentalResponse>> GetRentalsByItemAsync(string itemId)
        {
            _logger.LogInformation("Fetching rentals for item={ItemId}", itemId);
            var rentals = await _repository.GetByItemIdAsync(itemId);
            return rentals.Select(r => r.ToResponse());
        }

        public async Task<IEnumerable<RentalResponse>> GetRentalsByStatusAsync(RentalStatus status)
        {
            _logger.LogInformation("Fetching rentals with status={Status}", status);
            var rentals = await _repository.GetByStatusAsync(status);
            return rentals.Select(r => r.ToResponse());
        }

        public async Task<RentalResponse?> UpdateRentalStatusAsync(Guid id, UpdateRentalStatusRequest request)
        {
            _logger.LogInformation("Updating rental Id={Id} to status={Status}", id, request.Status);

            var rental = await _repository.GetByIdAsync(id);
            if (rental is null)
            {
                _logger.LogWarning("Rental Id={Id} not found for status update", id);
                return null;
            }

            ValidateStatusTransition(rental.Status, request.Status);

            rental.Status = request.Status;
            rental.RejectionReason = request.RejectionReason;
            rental.UpdatedAt = DateTime.UtcNow;

            if (request.Status == RentalStatus.Active)
                rental.StartDate = DateTime.UtcNow;

            var updated = await _repository.UpdateAsync(rental);
            if (updated is null) return null;

            var eventType = request.Status switch
            {
                RentalStatus.Approved => "rental.approved",
                RentalStatus.Rejected => "rental.rejected",
                RentalStatus.Active => "rental.activated",
                RentalStatus.Completed => "rental.completed",
                RentalStatus.Cancelled => "rental.cancelled",
                _ => "rental.updated"
            };

            await _publisher.PublishRentalEventAsync(eventType, updated);

            var response = updated.ToResponse();
            _stream.Publish(response);

            _logger.LogInformation("Rental Id={Id} status updated to {Status}", id, request.Status);
            return response;
        }

        public async Task<bool> CancelRentalAsync(Guid id, string requesterId)
        {
            _logger.LogInformation("Cancelling rental Id={Id} by requester={RequesterId}", id, requesterId);

            var rental = await _repository.GetByIdAsync(id);
            if (rental is null) return false;

            if (rental.BorrowerId != requesterId && rental.OwnerId != requesterId)
                throw new UnauthorizedAccessException("You can only cancel your own rentals");

            if (rental.Status is RentalStatus.Completed or RentalStatus.Rejected)
                throw new InvalidOperationException($"Cannot cancel a rental with status {rental.Status}");

            rental.Status = RentalStatus.Cancelled;
            rental.UpdatedAt = DateTime.UtcNow;

            var updated = await _repository.UpdateAsync(rental);
            if (updated is null) return false;

            await _publisher.PublishRentalEventAsync("rental.cancelled", updated);
            _stream.Publish(updated.ToResponse());

            return true;
        }

        private static void ValidateStatusTransition(RentalStatus current, RentalStatus next)
        {
            var allowed = current switch
            {
                RentalStatus.Pending => new[] { RentalStatus.Approved, RentalStatus.Rejected, RentalStatus.Cancelled },
                RentalStatus.Approved => new[] { RentalStatus.Active, RentalStatus.Cancelled },
                RentalStatus.Active => new[] { RentalStatus.Completed, RentalStatus.Cancelled },
                _ => Array.Empty<RentalStatus>()
            };

            if (!allowed.Contains(next))
                throw new InvalidOperationException($"Cannot transition from {current} to {next}");
        }
    }
}
