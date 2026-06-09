package item.toolloop.com

import item.toolloop.com.model.CreateItemRequest
import item.toolloop.com.model.ItemStatus
import item.toolloop.com.model.UpdateItemRequest
import item.toolloop.com.service.ItemService
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import mu.KotlinLogging

private val logger = KotlinLogging.logger {}

fun Application.configureRouting(itemService: ItemService) {
    routing {
        get("/health") {
            call.respond(
                mapOf(
                    "service" to "item-service",
                    "status" to "UP",
                    "timestamp" to java.time.Instant.now().toString()
                )
            )
        }
        
        route("/items") {

            // GET /items?category=X&available=true
            get {
                val category  = call.request.queryParameters["category"]
                val available = call.request.queryParameters["available"]?.toBooleanStrictOrNull()

                val items = when {
                    available == true -> itemService.getAvailableItems()
                    category != null -> itemService.getItemsByCategory(category)
                    else -> itemService.getAllItems()
                }

                logger.info { "GET /items → ${items.size} results" }
                call.respond(items)
            }

            // POST /items
            post {
                val request = call.receive<CreateItemRequest>()
                val item = itemService.createItem(request)
                logger.info { "POST /items → created ${item.id}" }
                call.respond(HttpStatusCode.Created, item)
            }

            // GET /items/owner/{ownerId}
            get("/owner/{ownerId}") {
                val ownerId = call.parameters["ownerId"]!!
                val items = itemService.getItemsByOwner(ownerId)
                logger.info { "GET /items/owner/$ownerId → ${items.size} items" }
                call.respond(items)
            }

            // GET /items/{id}
            get("/{id}") {
                val id   = call.parameters["id"]!!
                val item = itemService.getItemById(id)

                if (item != null) {
                    call.respond(item)
                } else {
                    logger.warn { "GET /items/$id → not found" }
                    call.respond(HttpStatusCode.NotFound, mapOf("error" to "Item not found"))
                }
            }

            // PUT /items/{id}
            put("/{id}") {
                val id      = call.parameters["id"]!!
                val request = call.receive<UpdateItemRequest>()
                val item    = itemService.updateItem(id, request)

                if (item != null) {
                    logger.info { "PUT /items/$id → updated" }
                    call.respond(item)
                } else {
                    logger.warn { "PUT /items/$id → not found" }
                    call.respond(HttpStatusCode.NotFound, mapOf("error" to "Item not found"))
                }
            }

            // DELETE /items/{id}
            delete("/{id}") {
                val id      = call.parameters["id"]!!
                val deleted = itemService.deleteItem(id)

                if (deleted) {
                    logger.info { "DELETE /items/$id → deleted" }
                    call.respond(mapOf("message" to "Item deleted"))
                } else {
                    logger.warn { "DELETE /items/$id → not found" }
                    call.respond(HttpStatusCode.NotFound, mapOf("error" to "Item not found"))
                }
            }

            // PATCH /items/{id}/status
            patch("/{id}/status") {
                val id     = call.parameters["id"]!!
                val body   = call.receive<Map<String, String>>()
                val status = body["status"]

                if (status == null) {
                    call.respond(HttpStatusCode.BadRequest, mapOf("error" to "status field is required"))
                    return@patch
                }

                val itemStatus = try {
                    ItemStatus.valueOf(status.uppercase())
                } catch (e: IllegalArgumentException) {
                    call.respond(
                        HttpStatusCode.BadRequest,
                        mapOf("error" to "Invalid status. Must be AVAILABLE, BORROWED, or UNAVAILABLE")
                    )
                    return@patch
                }

                val item = itemService.updateItemStatus(id, itemStatus)

                if (item != null) {
                    logger.info { "PATCH /items/$id/status → $status" }
                    call.respond(item)
                } else {
                    call.respond(HttpStatusCode.NotFound, mapOf("error" to "Item not found"))
                }
            }
        }
    }
}