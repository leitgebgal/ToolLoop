using System.Reactive.Linq;

namespace rental_service.Services
{
    public sealed class RentalStreamLogger : BackgroundService
    {
        private readonly IRentalStreamService _stream;
        private readonly ILogger<RentalStreamLogger> _logger;
        private IDisposable? _subscription;

        public RentalStreamLogger(
            IRentalStreamService stream,
            ILogger<RentalStreamLogger> logger)
        {
            _stream = stream;
            _logger = logger;
        }

        protected override Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _subscription = _stream.Stream
                .Do(r => _logger.LogInformation(
                    "[Rx] Rental event: Id={Id} Status={Status}",
                    r.Id,
                    r.Status))
                .Subscribe();

            stoppingToken.Register(() => _subscription?.Dispose());

            return Task.CompletedTask;
        }

        public override void Dispose()
        {
            _subscription?.Dispose();
            base.Dispose();
        }
    }
}
