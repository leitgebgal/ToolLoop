package item.toolloop.com

import item.toolloop.com.grpc.ItemGrpcService
import item.toolloop.com.repository.ItemRepository
import item.toolloop.com.service.ItemService
import io.grpc.ServerBuilder
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.netty.*
import io.ktor.server.plugins.contentnegotiation.*
import io.ktor.server.plugins.statuspages.*
import io.ktor.server.response.*
import kotlinx.serialization.json.Json
import mu.KotlinLogging

private val logger = KotlinLogging.logger {}

fun main() {
    val mongoUri = System.getenv("MONGO_URI")  ?: "mongodb://localhost:27017"
    val httpPort = System.getenv("PORT")?.toInt() ?: 8080
    val grpcPort = System.getenv("GRPC_PORT")?.toInt() ?: 50051

    // Database
    val db = Database.connect(mongoUri)
    val repository = ItemRepository(db.getCollection())
    val service = ItemService(repository)

    // gRPC server
    val grpcServer = ServerBuilder
        .forPort(grpcPort)
        .addService(ItemGrpcService(service))
        .build()
        .start()

    logger.info { "gRPC server started on port $grpcPort" }

    // Ktor HTTP server
    embeddedServer(Netty, port = httpPort) {
        install(ContentNegotiation) {
            json(Json {
                prettyPrint = true
                isLenient = true
                ignoreUnknownKeys = true
            })
        }
        install(StatusPages) {
            exception<IllegalArgumentException> { call, cause ->
                logger.warn { "Bad request: ${cause.message}" }
                call.respond(
                    io.ktor.http.HttpStatusCode.BadRequest,
                    mapOf("error" to (cause.message ?: "Bad request"))
                )
            }
            exception<Throwable> { call, cause ->
                logger.error(cause) { "Unhandled error: ${cause.message}" }
                call.respond(
                    io.ktor.http.HttpStatusCode.InternalServerError,
                    mapOf("error" to "Internal server error")
                )
            }
        }
        configureRouting(service)
    }.start(wait = false)

    logger.info { "HTTP server started on port $httpPort" }

    // Shutdown hook
    Runtime.getRuntime().addShutdownHook(Thread {
        logger.info { "Shutting down servers..." }
        grpcServer.shutdown()
    })

    grpcServer.awaitTermination()
}