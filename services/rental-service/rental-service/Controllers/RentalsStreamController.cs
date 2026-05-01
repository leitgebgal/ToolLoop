using System.Reactive.Linq;
using Microsoft.AspNetCore.Mvc;
using rental_service.Services;

namespace rental_service.Controllers
{
    /// <summary>
    /// Server-Sent Events endpoint exposing the Rx.NET rental stream to HTTP clients.
    /// </summary>
    [ApiController]
    [Route("api/rentals/stream")]
    public class RentalStreamController(IRentalStreamService streamService, ILogger<RentalStreamController> logger) : ControllerBase
    {
        /// <summary>
        /// Subscribe to a live Server-Sent Events stream of rental state changes.
        /// Uses Rx.NET observables under the hood.
        /// </summary>
        [HttpGet]
        public async Task StreamRentals(CancellationToken cancellationToken)
        {
            Response.Headers.Append("Content-Type", "text/event-stream");
            Response.Headers.Append("Cache-Control", "no-cache");
            Response.Headers.Append("X-Accel-Buffering", "no");

            logger.LogInformation("Client connected to rental SSE stream");

            var completion = new TaskCompletionSource();

            await using var cancellationRegistration =
                cancellationToken.Register(() => completion.TrySetResult());

            using var subscription = streamService.Stream.Subscribe(
                async rental =>
                {
                    try
                    {
                        var json = System.Text.Json.JsonSerializer.Serialize(rental);

                        await Response.WriteAsync($"data: {json}\n\n", cancellationToken);
                        await Response.Body.FlushAsync(cancellationToken);
                    }
                    catch (Exception ex)
                    {
                        logger.LogWarning(ex, "Stopping rental SSE stream");
                        completion.TrySetResult();
                    }
                },
                ex =>
                {
                    logger.LogError(ex, "Rental SSE stream failed");
                    completion.TrySetException(ex);
                },
                () => completion.TrySetResult()
            );

            await completion.Task;

            logger.LogInformation("Client disconnected from rental SSE stream");
        }
    }
}
