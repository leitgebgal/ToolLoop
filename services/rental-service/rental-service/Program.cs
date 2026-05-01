using Microsoft.EntityFrameworkCore;
using rental_service.Data;
using rental_service.Messaging;
using rental_service.Middleware;
using rental_service.Repositories;
using rental_service.Services;
using Scalar.AspNetCore;
using Serilog;

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateBootstrapLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);

    // Serilog
    builder.Host.UseSerilog((ctx, cfg) =>
        cfg.ReadFrom.Configuration(ctx.Configuration)
           .WriteTo.Console());

    // PostgreSQL / EF Core
    builder.Services.AddDbContext<RentalDbContext>(options =>
        options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

    // Application Services
    builder.Services.AddScoped<IRentalRepository, RentalRepository>();
    builder.Services.AddScoped<IMessagePublisher, ActiveMqPublisher>();
    builder.Services.AddScoped<IRentalService, RentalService>();

    // Singleton: owns the Rx.NET Subject so the SSE stream lives across requests
    builder.Services.AddSingleton<IRentalStreamService, RentalStreamService>();
    builder.Services.AddHostedService<RentalStreamLogger>();

    // Controllers + JSON
    builder.Services.AddControllers()
        .AddJsonOptions(opts =>
            opts.JsonSerializerOptions.Converters.Add(
                new System.Text.Json.Serialization.JsonStringEnumConverter()));

    // OpenAPI (.NET 10 built-in)
    builder.Services.AddOpenApi(options =>
    {
        options.AddDocumentTransformer((document, context, ct) =>
        {
            document.Info.Title = "ToolLoop - Rental Service";
            document.Info.Version = "v1";
            document.Info.Description =
                "Manages rental requests between borrowers and item owners. " +
                "Publishes domain events via Apache ActiveMQ.";
            return Task.CompletedTask;
        });
    });

    var app = builder.Build();

    // Middleware pipeline
    app.UseMiddleware<ExceptionHandlingMiddleware>();
    app.UseSerilogRequestLogging();

    if (app.Environment.IsDevelopment())
    {
        // Serves OpenAPI JSON at /openapi/v1.json
        app.MapOpenApi();

        // Scalar UI at /scalar/v1
        app.MapScalarApiReference();
    }

    app.MapControllers();

    // DB Migration on startup
    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<RentalDbContext>();
        db.Database.Migrate();
        Log.Information("Database migration applied");
    }

    Log.Information("Rental Service starting");

    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}

// Needed for integration test WebApplicationFactory
public partial class Program { }