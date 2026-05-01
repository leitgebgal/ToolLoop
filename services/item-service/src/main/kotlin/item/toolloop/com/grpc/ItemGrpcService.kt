package item.toolloop.com.grpc

import item.toolloop.com.model.CreateItemRequest as ServiceCreateItemRequest
import item.toolloop.com.model.ItemResponse
import item.toolloop.com.model.ItemStatus
import item.toolloop.com.model.UpdateItemRequest as ServiceUpdateItemRequest
import item.toolloop.com.service.ItemService
import mu.KotlinLogging

private val logger = KotlinLogging.logger {}

class ItemGrpcService(
    private val itemService: ItemService
) : ItemServiceGrpcKt.ItemServiceCoroutineImplBase() {

    private fun ItemResponse.toProto(): Item =
        item {
            id = this@toProto.id
            ownerId = this@toProto.ownerId
            name = this@toProto.name
            description = this@toProto.description
            category = this@toProto.category
            status = this@toProto.status
            location = this@toProto.location
            createdAt = this@toProto.createdAt
            updatedAt = this@toProto.updatedAt
        }

    private fun parseStatus(status: String): ItemStatus =
        ItemStatus.valueOf(status.uppercase())

    override suspend fun createItem(request: CreateItemRequest): CreateItemResponse {
        logger.info { "gRPC createItem called for name: ${request.name}" }

        return try {
            val created = itemService.createItem(
                ServiceCreateItemRequest(
                    ownerId = request.ownerId,
                    name = request.name,
                    description = request.description,
                    category = request.category,
                    location = request.location
                )
            )

            createItemResponse {
                success = true
                message = "Item created successfully"
                item = created.toProto()
            }
        } catch (e: IllegalArgumentException) {
            logger.warn(e) { "gRPC createItem validation failed" }
            createItemResponse {
                success = false
                message = e.message ?: "Invalid create item request"
            }
        } catch (e: Exception) {
            logger.error(e) { "gRPC createItem failed" }
            createItemResponse {
                success = false
                message = "Failed to create item"
            }
        }
    }

    override suspend fun getAllItems(request: GetAllItemsRequest): ItemsResponse {
        logger.info { "gRPC getAllItems called" }

        val items = itemService.getAllItems()

        return itemsResponse {
            this.items += items.map { it.toProto() }
        }
    }

    override suspend fun getItem(request: GetItemRequest): GetItemResponse {
        logger.info { "gRPC getItem called for id: ${request.id}" }

        val itemDto = itemService.getItemById(request.id)

        return if (itemDto != null) {
            getItemResponse {
                found = true
                item = itemDto.toProto()
            }
        } else {
            logger.warn { "gRPC getItem: item not found for id ${request.id}" }
            getItemResponse {
                found = false
            }
        }
    }

    override suspend fun getItemsByOwner(request: GetItemsByOwnerRequest): GetItemsByOwnerResponse {
        logger.info { "gRPC getItemsByOwner called for ownerId: ${request.ownerId}" }

        val items = itemService.getItemsByOwner(request.ownerId)

        return getItemsByOwnerResponse {
            this.items += items.map { it.toProto() }
        }
    }

    override suspend fun getAvailableItems(request: GetAvailableItemsRequest): ItemsResponse {
        logger.info { "gRPC getAvailableItems called" }

        val items = itemService.getAvailableItems()

        return itemsResponse {
            this.items += items.map { it.toProto() }
        }
    }

    override suspend fun getItemsByCategory(request: GetItemsByCategoryRequest): ItemsResponse {
        logger.info { "gRPC getItemsByCategory called for category: ${request.category}" }

        val items = itemService.getItemsByCategory(request.category)

        return itemsResponse {
            this.items += items.map { it.toProto() }
        }
    }

    override suspend fun updateItem(request: UpdateItemRequest): UpdateItemResponse {
        logger.info { "gRPC updateItem called for id: ${request.id}" }

        return try {
            val updateRequest = ServiceUpdateItemRequest(
                name = request.name.takeIf { it.isNotBlank() },
                description = request.description.takeIf { it.isNotBlank() },
                category = request.category.takeIf { it.isNotBlank() },
                status = request.status.takeIf { it.isNotBlank() }?.let { parseStatus(it) },
                location = request.location.takeIf { it.isNotBlank() }
            )

            val updated = itemService.updateItem(request.id, updateRequest)

            if (updated != null) {
                updateItemResponse {
                    success = true
                    message = "Item updated successfully"
                    item = updated.toProto()
                }
            } else {
                updateItemResponse {
                    success = false
                    message = "Item not found"
                }
            }
        } catch (e: IllegalArgumentException) {
            logger.warn(e) { "gRPC updateItem failed validation/status parsing" }
            updateItemResponse {
                success = false
                message = e.message ?: "Invalid update request"
            }
        } catch (e: Exception) {
            logger.error(e) { "gRPC updateItem failed" }
            updateItemResponse {
                success = false
                message = "Failed to update item"
            }
        }
    }

    override suspend fun deleteItem(request: DeleteItemRequest): DeleteItemResponse {
        logger.info { "gRPC deleteItem called for id: ${request.id}" }

        return try {
            val deleted = itemService.deleteItem(request.id)

            if (deleted) {
                deleteItemResponse {
                    success = true
                    message = "Item deleted successfully"
                }
            } else {
                deleteItemResponse {
                    success = false
                    message = "Item not found"
                }
            }
        } catch (e: Exception) {
            logger.error(e) { "gRPC deleteItem failed" }
            deleteItemResponse {
                success = false
                message = "Failed to delete item"
            }
        }
    }

    override suspend fun checkItemAvailability(request: CheckItemAvailabilityRequest): CheckItemAvailabilityResponse {
        logger.info { "gRPC checkItemAvailability called for id: ${request.id}" }

        val available = itemService.isItemAvailable(request.id)

        return checkItemAvailabilityResponse {
            this.available = available
        }
    }

    override suspend fun updateItemStatus(request: UpdateItemStatusRequest): UpdateItemStatusResponse {
        logger.info { "gRPC updateItemStatus called for id: ${request.id}, status: ${request.status}" }

        return try {
            val status = parseStatus(request.status)
            val updated = itemService.updateItemStatus(request.id, status)

            if (updated != null) {
                updateItemStatusResponse {
                    success = true
                    message = "Status updated to ${status.name}"
                    item = updated.toProto()
                }
            } else {
                updateItemStatusResponse {
                    success = false
                    message = "Item not found"
                }
            }
        } catch (e: IllegalArgumentException) {
            logger.warn { "gRPC updateItemStatus: invalid status '${request.status}'" }
            updateItemStatusResponse {
                success = false
                message = "Invalid status: ${request.status}. Must be AVAILABLE, BORROWED, or UNAVAILABLE"
            }
        } catch (e: Exception) {
            logger.error(e) { "gRPC updateItemStatus failed" }
            updateItemStatusResponse {
                success = false
                message = "Failed to update item status"
            }
        }
    }
}