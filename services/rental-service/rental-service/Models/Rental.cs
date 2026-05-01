namespace rental_service.Models
{
    public enum RentalStatus
    {
        Pending,
        Approved,
        Rejected,
        Active,
        Completed,
        Cancelled
    }

    public class Rental
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public string ItemId { get; set; } = string.Empty;
        public string BorrowerId { get; set; } = string.Empty;
        public string OwnerId { get; set; } = string.Empty;

        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }

        public RentalStatus Status { get; set; } = RentalStatus.Pending;

        public string? Message { get; set; }
        public string? RejectionReason { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
