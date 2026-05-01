using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using rental_service.DTOs;
using rental_service.Messaging;
using rental_service.Models;
using rental_service.Repositories;
using rental_service.Services;
using Xunit;

namespace rental_service_tests;

public class RentalServiceTests
{
    private readonly Mock<IRentalRepository> _repoMock = new();
    private readonly Mock<IMessagePublisher> _publisherMock = new();
    private readonly Mock<ILogger<RentalService>> _loggerMock = new();
    private readonly IRentalStreamService _stream = new RentalStreamService();

    private RentalService CreateService() =>
        new(
            _repoMock.Object,
            _publisherMock.Object,
            _stream,
            _loggerMock.Object
        );

    private static CreateRentalRequest ValidRequest() => new(
        ItemId: "item-1",
        BorrowerId: "user-borrower",
        OwnerId: "user-owner",
        StartDate: DateTime.UtcNow.Date.AddDays(1),
        EndDate: DateTime.UtcNow.Date.AddDays(5),
        Message: "Can I borrow this?"
    );

    private static Rental ValidRental(RentalStatus status = RentalStatus.Pending) => new()
    {
        Id = Guid.NewGuid(),
        ItemId = "item-1",
        BorrowerId = "user-borrower",
        OwnerId = "user-owner",
        StartDate = DateTime.UtcNow.Date.AddDays(1),
        EndDate = DateTime.UtcNow.Date.AddDays(5),
        Status = status,
        Message = "Can I borrow this?",
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow
    };

    [Fact]
    public async Task CreateRentalAsync_ValidRequest_ReturnsPendingRentalResponse()
    {
        var request = ValidRequest();

        _repoMock
            .Setup(r => r.CreateAsync(It.IsAny<Rental>()))
            .ReturnsAsync((Rental rental) => rental);

        var service = CreateService();

        var result = await service.CreateRentalAsync(request);

        result.Should().NotBeNull();
        result.ItemId.Should().Be(request.ItemId);
        result.BorrowerId.Should().Be(request.BorrowerId);
        result.OwnerId.Should().Be(request.OwnerId);
        result.Status.Should().Be("Pending");
        result.Message.Should().Be(request.Message);
    }

    [Fact]
    public async Task CreateRentalAsync_ValidRequest_SavesRentalToRepository()
    {
        var request = ValidRequest();

        _repoMock
            .Setup(r => r.CreateAsync(It.IsAny<Rental>()))
            .ReturnsAsync((Rental rental) => rental);

        var service = CreateService();

        await service.CreateRentalAsync(request);

        _repoMock.Verify(r => r.CreateAsync(It.Is<Rental>(rental =>
            rental.ItemId == request.ItemId &&
            rental.BorrowerId == request.BorrowerId &&
            rental.OwnerId == request.OwnerId &&
            rental.Status == RentalStatus.Pending
        )), Times.Once);
    }

    [Fact]
    public async Task CreateRentalAsync_ValidRequest_PublishesActiveMqCreatedEvent()
    {
        var request = ValidRequest();

        _repoMock
            .Setup(r => r.CreateAsync(It.IsAny<Rental>()))
            .ReturnsAsync((Rental rental) => rental);

        var service = CreateService();

        await service.CreateRentalAsync(request);

        _publisherMock.Verify(
            p => p.PublishRentalEventAsync("rental.created", It.IsAny<Rental>()),
            Times.Once);
    }

    [Fact]
    public async Task CreateRentalAsync_ValidRequest_EmitsReactiveStreamEvent()
    {
        var request = ValidRequest();

        _repoMock
            .Setup(r => r.CreateAsync(It.IsAny<Rental>()))
            .ReturnsAsync((Rental rental) => rental);

        RentalResponse? received = null;
        using var subscription = _stream.Stream.Subscribe(rental => received = rental);

        var service = CreateService();

        await service.CreateRentalAsync(request);

        received.Should().NotBeNull();
        received!.ItemId.Should().Be(request.ItemId);
        received.Status.Should().Be("Pending");
    }

    [Fact]
    public async Task CreateRentalAsync_EndDateBeforeStartDate_ThrowsArgumentException()
    {
        var request = ValidRequest() with
        {
            StartDate = DateTime.UtcNow.Date.AddDays(5),
            EndDate = DateTime.UtcNow.Date.AddDays(1)
        };

        var service = CreateService();

        Func<Task> act = () => service.CreateRentalAsync(request);

        await act.Should()
            .ThrowAsync<ArgumentException>()
            .WithMessage("*EndDate must be after StartDate*");
    }

    [Fact]
    public async Task CreateRentalAsync_StartDateInPast_ThrowsArgumentException()
    {
        var request = ValidRequest() with
        {
            StartDate = DateTime.UtcNow.Date.AddDays(-1),
            EndDate = DateTime.UtcNow.Date.AddDays(2)
        };

        var service = CreateService();

        Func<Task> act = () => service.CreateRentalAsync(request);

        await act.Should()
            .ThrowAsync<ArgumentException>()
            .WithMessage("*StartDate cannot be in the past*");
    }

    [Fact]
    public async Task GetRentalByIdAsync_ExistingRental_ReturnsRentalResponse()
    {
        var rental = ValidRental();

        _repoMock
            .Setup(r => r.GetByIdAsync(rental.Id))
            .ReturnsAsync(rental);

        var service = CreateService();

        var result = await service.GetRentalByIdAsync(rental.Id);

        result.Should().NotBeNull();
        result!.Id.Should().Be(rental.Id);
        result.ItemId.Should().Be(rental.ItemId);
    }

    [Fact]
    public async Task GetRentalByIdAsync_MissingRental_ReturnsNull()
    {
        _repoMock
            .Setup(r => r.GetByIdAsync(It.IsAny<Guid>()))
            .ReturnsAsync((Rental?)null);

        var service = CreateService();

        var result = await service.GetRentalByIdAsync(Guid.NewGuid());

        result.Should().BeNull();
    }

    [Fact]
    public async Task GetAllRentalsAsync_ReturnsMappedResponses()
    {
        var rentals = new[]
        {
            ValidRental(),
            ValidRental(RentalStatus.Approved)
        };

        _repoMock
            .Setup(r => r.GetAllAsync())
            .ReturnsAsync(rentals);

        var service = CreateService();

        var result = await service.GetAllRentalsAsync();

        result.Should().HaveCount(2);
        result.Select(r => r.Status).Should().Contain(["Pending", "Approved"]);
    }

    [Fact]
    public async Task GetRentalsByBorrowerAsync_ReturnsBorrowerRentals()
    {
        var borrowerId = "user-borrower";
        var rentals = new[] { ValidRental() };

        _repoMock
            .Setup(r => r.GetByBorrowerIdAsync(borrowerId))
            .ReturnsAsync(rentals);

        var service = CreateService();

        var result = await service.GetRentalsByBorrowerAsync(borrowerId);

        result.Should().HaveCount(1);
        result.First().BorrowerId.Should().Be(borrowerId);
    }

    [Fact]
    public async Task GetRentalsByOwnerAsync_ReturnsOwnerRentals()
    {
        var ownerId = "user-owner";
        var rentals = new[] { ValidRental() };

        _repoMock
            .Setup(r => r.GetByOwnerIdAsync(ownerId))
            .ReturnsAsync(rentals);

        var service = CreateService();

        var result = await service.GetRentalsByOwnerAsync(ownerId);

        result.Should().HaveCount(1);
        result.First().OwnerId.Should().Be(ownerId);
    }

    [Fact]
    public async Task GetRentalsByItemAsync_ReturnsItemRentals()
    {
        var itemId = "item-1";
        var rentals = new[] { ValidRental() };

        _repoMock
            .Setup(r => r.GetByItemIdAsync(itemId))
            .ReturnsAsync(rentals);

        var service = CreateService();

        var result = await service.GetRentalsByItemAsync(itemId);

        result.Should().HaveCount(1);
        result.First().ItemId.Should().Be(itemId);
    }

    [Fact]
    public async Task GetRentalsByStatusAsync_ReturnsStatusRentals()
    {
        var rentals = new[] { ValidRental(RentalStatus.Approved) };

        _repoMock
            .Setup(r => r.GetByStatusAsync(RentalStatus.Approved))
            .ReturnsAsync(rentals);

        var service = CreateService();

        var result = await service.GetRentalsByStatusAsync(RentalStatus.Approved);

        result.Should().HaveCount(1);
        result.First().Status.Should().Be("Approved");
    }

    [Fact]
    public async Task UpdateRentalStatusAsync_PendingToApproved_UpdatesRental()
    {
        var rental = ValidRental(RentalStatus.Pending);

        _repoMock
            .Setup(r => r.GetByIdAsync(rental.Id))
            .ReturnsAsync(rental);

        _repoMock
            .Setup(r => r.UpdateAsync(It.IsAny<Rental>()))
            .ReturnsAsync((Rental rentalToUpdate) => rentalToUpdate);

        var service = CreateService();

        var result = await service.UpdateRentalStatusAsync(
            rental.Id,
            new UpdateRentalStatusRequest(RentalStatus.Approved, null));

        result.Should().NotBeNull();
        result!.Status.Should().Be("Approved");
    }

    [Fact]
    public async Task UpdateRentalStatusAsync_PendingToApproved_PublishesApprovedEvent()
    {
        var rental = ValidRental(RentalStatus.Pending);

        _repoMock
            .Setup(r => r.GetByIdAsync(rental.Id))
            .ReturnsAsync(rental);

        _repoMock
            .Setup(r => r.UpdateAsync(It.IsAny<Rental>()))
            .ReturnsAsync((Rental rentalToUpdate) => rentalToUpdate);

        var service = CreateService();

        await service.UpdateRentalStatusAsync(
            rental.Id,
            new UpdateRentalStatusRequest(RentalStatus.Approved, null));

        _publisherMock.Verify(
            p => p.PublishRentalEventAsync("rental.approved", It.IsAny<Rental>()),
            Times.Once);
    }

    [Fact]
    public async Task UpdateRentalStatusAsync_PendingToRejected_PublishesRejectedEvent()
    {
        var rental = ValidRental(RentalStatus.Pending);

        _repoMock
            .Setup(r => r.GetByIdAsync(rental.Id))
            .ReturnsAsync(rental);

        _repoMock
            .Setup(r => r.UpdateAsync(It.IsAny<Rental>()))
            .ReturnsAsync((Rental rentalToUpdate) => rentalToUpdate);

        var service = CreateService();

        await service.UpdateRentalStatusAsync(
            rental.Id,
            new UpdateRentalStatusRequest(RentalStatus.Rejected, "Item unavailable"));

        _publisherMock.Verify(
            p => p.PublishRentalEventAsync("rental.rejected", It.IsAny<Rental>()),
            Times.Once);
    }

    [Fact]
    public async Task UpdateRentalStatusAsync_ApprovedToActive_PublishesActivatedEvent()
    {
        var rental = ValidRental(RentalStatus.Approved);

        _repoMock
            .Setup(r => r.GetByIdAsync(rental.Id))
            .ReturnsAsync(rental);

        _repoMock
            .Setup(r => r.UpdateAsync(It.IsAny<Rental>()))
            .ReturnsAsync((Rental rentalToUpdate) => rentalToUpdate);

        var service = CreateService();

        await service.UpdateRentalStatusAsync(
            rental.Id,
            new UpdateRentalStatusRequest(RentalStatus.Active, null));

        _publisherMock.Verify(
            p => p.PublishRentalEventAsync("rental.activated", It.IsAny<Rental>()),
            Times.Once);
    }

    [Fact]
    public async Task UpdateRentalStatusAsync_ActiveToCompleted_PublishesCompletedEvent()
    {
        var rental = ValidRental(RentalStatus.Active);

        _repoMock
            .Setup(r => r.GetByIdAsync(rental.Id))
            .ReturnsAsync(rental);

        _repoMock
            .Setup(r => r.UpdateAsync(It.IsAny<Rental>()))
            .ReturnsAsync((Rental rentalToUpdate) => rentalToUpdate);

        var service = CreateService();

        await service.UpdateRentalStatusAsync(
            rental.Id,
            new UpdateRentalStatusRequest(RentalStatus.Completed, null));

        _publisherMock.Verify(
            p => p.PublishRentalEventAsync("rental.completed", It.IsAny<Rental>()),
            Times.Once);
    }

    [Fact]
    public async Task UpdateRentalStatusAsync_InvalidTransition_ThrowsInvalidOperationException()
    {
        var rental = ValidRental(RentalStatus.Completed);

        _repoMock
            .Setup(r => r.GetByIdAsync(rental.Id))
            .ReturnsAsync(rental);

        var service = CreateService();

        Func<Task> act = () => service.UpdateRentalStatusAsync(
            rental.Id,
            new UpdateRentalStatusRequest(RentalStatus.Approved, null));

        await act.Should()
            .ThrowAsync<InvalidOperationException>()
            .WithMessage("*Cannot transition from Completed to Approved*");
    }

    [Fact]
    public async Task UpdateRentalStatusAsync_MissingRental_ReturnsNull()
    {
        _repoMock
            .Setup(r => r.GetByIdAsync(It.IsAny<Guid>()))
            .ReturnsAsync((Rental?)null);

        var service = CreateService();

        var result = await service.UpdateRentalStatusAsync(
            Guid.NewGuid(),
            new UpdateRentalStatusRequest(RentalStatus.Approved, null));

        result.Should().BeNull();
    }

    [Fact]
    public async Task UpdateRentalStatusAsync_ValidUpdate_EmitsReactiveStreamEvent()
    {
        var rental = ValidRental(RentalStatus.Pending);

        _repoMock
            .Setup(r => r.GetByIdAsync(rental.Id))
            .ReturnsAsync(rental);

        _repoMock
            .Setup(r => r.UpdateAsync(It.IsAny<Rental>()))
            .ReturnsAsync((Rental rentalToUpdate) => rentalToUpdate);

        RentalResponse? received = null;
        using var subscription = _stream.Stream.Subscribe(rentalResponse => received = rentalResponse);

        var service = CreateService();

        await service.UpdateRentalStatusAsync(
            rental.Id,
            new UpdateRentalStatusRequest(RentalStatus.Approved, null));

        received.Should().NotBeNull();
        received!.Status.Should().Be("Approved");
    }

    [Fact]
    public async Task CancelRentalAsync_ByBorrower_Succeeds()
    {
        var rental = ValidRental(RentalStatus.Pending);

        _repoMock
            .Setup(r => r.GetByIdAsync(rental.Id))
            .ReturnsAsync(rental);

        _repoMock
            .Setup(r => r.UpdateAsync(It.IsAny<Rental>()))
            .ReturnsAsync((Rental rentalToUpdate) => rentalToUpdate);

        var service = CreateService();

        var result = await service.CancelRentalAsync(rental.Id, rental.BorrowerId);

        result.Should().BeTrue();
    }

    [Fact]
    public async Task CancelRentalAsync_ByOwner_Succeeds()
    {
        var rental = ValidRental(RentalStatus.Pending);

        _repoMock
            .Setup(r => r.GetByIdAsync(rental.Id))
            .ReturnsAsync(rental);

        _repoMock
            .Setup(r => r.UpdateAsync(It.IsAny<Rental>()))
            .ReturnsAsync((Rental rentalToUpdate) => rentalToUpdate);

        var service = CreateService();

        var result = await service.CancelRentalAsync(rental.Id, rental.OwnerId);

        result.Should().BeTrue();
    }

    [Fact]
    public async Task CancelRentalAsync_MissingRental_ReturnsFalse()
    {
        _repoMock
            .Setup(r => r.GetByIdAsync(It.IsAny<Guid>()))
            .ReturnsAsync((Rental?)null);

        var service = CreateService();

        var result = await service.CancelRentalAsync(Guid.NewGuid(), "user-borrower");

        result.Should().BeFalse();
    }

    [Fact]
    public async Task CancelRentalAsync_UnauthorizedRequester_ThrowsUnauthorizedAccessException()
    {
        var rental = ValidRental(RentalStatus.Pending);

        _repoMock
            .Setup(r => r.GetByIdAsync(rental.Id))
            .ReturnsAsync(rental);

        var service = CreateService();

        Func<Task> act = () => service.CancelRentalAsync(rental.Id, "stranger-user");

        await act.Should()
            .ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("*You can only cancel your own rentals*");
    }

    [Fact]
    public async Task CancelRentalAsync_CompletedRental_ThrowsInvalidOperationException()
    {
        var rental = ValidRental(RentalStatus.Completed);

        _repoMock
            .Setup(r => r.GetByIdAsync(rental.Id))
            .ReturnsAsync(rental);

        var service = CreateService();

        Func<Task> act = () => service.CancelRentalAsync(rental.Id, rental.BorrowerId);

        await act.Should()
            .ThrowAsync<InvalidOperationException>()
            .WithMessage("*Cannot cancel a rental with status Completed*");
    }

    [Fact]
    public async Task CancelRentalAsync_RejectedRental_ThrowsInvalidOperationException()
    {
        var rental = ValidRental(RentalStatus.Rejected);

        _repoMock
            .Setup(r => r.GetByIdAsync(rental.Id))
            .ReturnsAsync(rental);

        var service = CreateService();

        Func<Task> act = () => service.CancelRentalAsync(rental.Id, rental.BorrowerId);

        await act.Should()
            .ThrowAsync<InvalidOperationException>()
            .WithMessage("*Cannot cancel a rental with status Rejected*");
    }

    [Fact]
    public async Task CancelRentalAsync_ValidCancellation_PublishesCancelledEvent()
    {
        var rental = ValidRental(RentalStatus.Pending);

        _repoMock
            .Setup(r => r.GetByIdAsync(rental.Id))
            .ReturnsAsync(rental);

        _repoMock
            .Setup(r => r.UpdateAsync(It.IsAny<Rental>()))
            .ReturnsAsync((Rental rentalToUpdate) => rentalToUpdate);

        var service = CreateService();

        await service.CancelRentalAsync(rental.Id, rental.BorrowerId);

        _publisherMock.Verify(
            p => p.PublishRentalEventAsync("rental.cancelled", It.IsAny<Rental>()),
            Times.Once);
    }

    [Fact]
    public async Task CancelRentalAsync_ValidCancellation_EmitsReactiveStreamEvent()
    {
        var rental = ValidRental(RentalStatus.Pending);

        _repoMock
            .Setup(r => r.GetByIdAsync(rental.Id))
            .ReturnsAsync(rental);

        _repoMock
            .Setup(r => r.UpdateAsync(It.IsAny<Rental>()))
            .ReturnsAsync((Rental rentalToUpdate) => rentalToUpdate);

        RentalResponse? received = null;
        using var subscription = _stream.Stream.Subscribe(rentalResponse => received = rentalResponse);

        var service = CreateService();

        await service.CancelRentalAsync(rental.Id, rental.BorrowerId);

        received.Should().NotBeNull();
        received!.Status.Should().Be("Cancelled");
    }
}