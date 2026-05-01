using rental_service.Models;

namespace rental_service.DTOs
{
    public record CreateRentalRequest(
        string ItemId,
        string BorrowerId,
        string OwnerId,
        DateTime StartDate,
        DateTime EndDate,
        string? Message
    );

    public record UpdateRentalStatusRequest(
        RentalStatus Status,
        string? RejectionReason
    );

    public record RentalResponse(
        Guid Id,
        string ItemId,
        string BorrowerId,
        string OwnerId,
        DateTime StartDate,
        DateTime EndDate,
        string Status,
        string? Message,
        string? RejectionReason,
        DateTime CreatedAt,
        DateTime UpdatedAt
    );

    public static class RentalMappings
    {
        public static RentalResponse ToResponse(this Rental rental) => new(
            rental.Id,
            rental.ItemId,
            rental.BorrowerId,
            rental.OwnerId,
            rental.StartDate,
            rental.EndDate,
            rental.Status.ToString(),
            rental.Message,
            rental.RejectionReason,
            rental.CreatedAt,
            rental.UpdatedAt
        );
    }
}
