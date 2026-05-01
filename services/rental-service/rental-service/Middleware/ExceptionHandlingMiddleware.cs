using System.Text.Json;

namespace rental_service.Middleware
{
    public class ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await next(context);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Unhandled exception on {Method} {Path}",
                    context.Request.Method, context.Request.Path);

                context.Response.ContentType = "application/json";

                (context.Response.StatusCode, var message) = ex switch
                {
                    ArgumentException => (400, ex.Message),
                    UnauthorizedAccessException => (403, ex.Message),
                    InvalidOperationException => (422, ex.Message),
                    _ => (500, "An unexpected error occurred")
                };

                var body = JsonSerializer.Serialize(new { error = message });
                await context.Response.WriteAsync(body);
            }
        }
    }
}
