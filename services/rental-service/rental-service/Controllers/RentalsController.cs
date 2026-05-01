using Microsoft.AspNetCore.Mvc;
using rental_service.DTOs;
using rental_service.Models;
using rental_service.Services;

namespace rental_service.Controllers
{
    /// <summary>
    /// Manages rental requests between borrowers and item owners.
    /// </summary>
    [ApiController]
    [Route("api/rentals")]
    [Produces("application/json")]
    public class RentalsController(IRentalService rentalService, ILogger<RentalsController> logger) : ControllerBase
    {
        /// <summary>Creates a new rental request.</summary>
        [HttpPost]
        [ProducesResponseType(typeof(RentalResponse), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> CreateRental([FromBody] CreateRentalRequest request)
        {
            try
            {
                var rental = await rentalService.CreateRentalAsync(request);
                return CreatedAtAction(nameof(GetRental), new { id = rental.Id }, rental);
            }
            catch (ArgumentException ex)
            {
                logger.LogWarning("Invalid rental request: {Message}", ex.Message);
                return BadRequest(new { error = ex.Message });
            }
        }

        /// <summary>Returns all rentals.</summary>
        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<RentalResponse>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> GetRentals([FromQuery] string? status)
        {
            if (status is not null)
            {
                if (!Enum.TryParse<RentalStatus>(status, true, out var parsed))
                    return BadRequest(new { error = $"Invalid rental status: {status}" });

                var filtered = await rentalService.GetRentalsByStatusAsync(parsed);
                return Ok(filtered);
            }

            var rentals = await rentalService.GetAllRentalsAsync();

            return Ok(rentals);
        }

        /// <summary>Returns a single rental by ID.</summary>
        [HttpGet("{id:guid}")]
        [ProducesResponseType(typeof(RentalResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetRental(Guid id)
        {
            var rental = await rentalService.GetRentalByIdAsync(id);
            return rental is null ? NotFound(new { error = "Rental not found" }) : Ok(rental);
        }

        /// <summary>Returns all rentals for a specific borrower.</summary>
        [HttpGet("borrower/{borrowerId}")]
        [ProducesResponseType(typeof(IEnumerable<RentalResponse>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetRentalsByBorrower(string borrowerId)
        {
            var rentals = await rentalService.GetRentalsByBorrowerAsync(borrowerId);
            return Ok(rentals);
        }

        /// <summary>Returns all rentals for a specific owner.</summary>
        [HttpGet("owner/{ownerId}")]
        [ProducesResponseType(typeof(IEnumerable<RentalResponse>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetRentalsByOwner(string ownerId)
        {
            var rentals = await rentalService.GetRentalsByOwnerAsync(ownerId);
            return Ok(rentals);
        }

        /// <summary>Returns all rentals for a specific item.</summary>
        [HttpGet("item/{itemId}")]
        [ProducesResponseType(typeof(IEnumerable<RentalResponse>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetRentalsByItem(string itemId)
        {
            var rentals = await rentalService.GetRentalsByItemAsync(itemId);
            return Ok(rentals);
        }

        /// <summary>Updates the status of a rental (approve, reject, activate, complete).</summary>
        [HttpPatch("{id:guid}/status")]
        [ProducesResponseType(typeof(RentalResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UpdateRentalStatus(Guid id, [FromBody] UpdateRentalStatusRequest request)
        {
            try
            {
                var rental = await rentalService.UpdateRentalStatusAsync(id, request);
                return rental is null ? NotFound(new { error = "Rental not found" }) : Ok(rental);
            }
            catch (InvalidOperationException ex)
            {
                logger.LogWarning("Invalid status transition for rental {Id}: {Message}", id, ex.Message);
                return BadRequest(new { error = ex.Message });
            }
        }

        /// <summary>Cancels a rental. Only the borrower or owner can cancel.</summary>
        [HttpDelete("{id:guid}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> CancelRental(Guid id, [FromQuery] string requesterId)
        {
            try
            {
                var success = await rentalService.CancelRentalAsync(id, requesterId);

                if (!success)
                    return NotFound(new { error = "Rental not found" });

                return Ok(new { message = "Rental cancelled" });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(
                    StatusCodes.Status403Forbidden,
                    new { error = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }
    }
}
