using System.Reactive.Linq;
using rental_service.DTOs;
using System.Reactive.Subjects;

namespace rental_service.Services
{
    public interface IRentalStreamService
    {
        void Publish(RentalResponse rental);
        IObservable<RentalResponse> Stream { get; }
    }

    public sealed class RentalStreamService : IRentalStreamService, IDisposable
    {
        private readonly ISubject<RentalResponse> _subject =
            Subject.Synchronize(new Subject<RentalResponse>());

        public IObservable<RentalResponse> Stream => _subject.AsObservable();

        public void Publish(RentalResponse rental)
        {
            _subject.OnNext(rental);
        }

        public void Dispose()
        {
            _subject.OnCompleted();
        }
    }
}
