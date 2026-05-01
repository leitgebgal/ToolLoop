using rental_service.Models;
using System.Text.Json;
using Apache.NMS;
using Apache.NMS.ActiveMQ;

namespace rental_service.Messaging
{
    public record RentalEvent(
        string EventType,
        Guid RentalId,
        string ItemId,
        string BorrowerId,
        string OwnerId,
        string Status,
        DateTime OccurredAt
    );

    public interface IMessagePublisher
    {
        Task PublishRentalEventAsync(string eventType, Rental rental);
    }

    public class ActiveMqPublisher : IMessagePublisher, IAsyncDisposable
    {
        private readonly ILogger<ActiveMqPublisher> _logger;
        private readonly string _brokerUri;
        private IConnection? _connection;
        private Apache.NMS.ISession? _session;

        private const string RentalEventsTopic = "rental.events";

        public ActiveMqPublisher(IConfiguration config, ILogger<ActiveMqPublisher> logger)
        {
            _logger = logger;
            _brokerUri = config["ActiveMQ:BrokerUri"] ?? "activemq:tcp://localhost:61616";
        }

        private async Task EnsureConnectedAsync()
        {
            if (_connection is not null && _connection.IsStarted) return;

            _logger.LogInformation("Connecting to ActiveMQ broker at {Uri}", _brokerUri);

            var factory = new ConnectionFactory(_brokerUri);
            _connection = await Task.Run(() => factory.CreateConnection());
            _connection.Start();
            _session = _connection.CreateSession(AcknowledgementMode.AutoAcknowledge);

            _logger.LogInformation("Connected to ActiveMQ broker");
        }

        public async Task PublishRentalEventAsync(string eventType, Rental rental)
        {
            try
            {
                await EnsureConnectedAsync();

                var rentalEvent = new RentalEvent(
                    eventType,
                    rental.Id,
                    rental.ItemId,
                    rental.BorrowerId,
                    rental.OwnerId,
                    rental.Status.ToString(),
                    DateTime.UtcNow
                );

                var destination = _session!.GetTopic(RentalEventsTopic);
                using var producer = _session.CreateProducer(destination);

                var json = JsonSerializer.Serialize(rentalEvent);
                var message = _session.CreateTextMessage(json);
                message.Properties["eventType"] = eventType;

                await Task.Run(() => producer.Send(message));

                _logger.LogInformation(
                    "Published {EventType} event for rental {RentalId} on topic {Topic}",
                    eventType, rental.Id, RentalEventsTopic);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to publish {EventType} event for rental {RentalId}",
                    eventType, rental.Id);
            }
        }

        public async ValueTask DisposeAsync()
        {
            if (_session is not null)
                await Task.Run(() => _session.Close());
            if (_connection is not null)
                await Task.Run(() => _connection.Close());
        }
    }
}
