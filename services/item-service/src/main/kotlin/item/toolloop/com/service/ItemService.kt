package item.toolloop.com.service

import item.toolloop.com.model.*
import item.toolloop.com.repository.ItemRepository
import mu.KotlinLogging

private val logger = KotlinLogging.logger {}

class ItemService(private val repository: ItemRepository) {

    suspend fun createItem(request: CreateItemRequest): ItemResponse {
        logger.info { "Service: creating item '${request.name}'" }

        require(request.name.isNotBlank()) { "Item name is required" }
        require(request.ownerId.isNotBlank()) { "Owner ID is required" }
        require(request.description.isNotBlank()) { "Description is required" }
        require(request.category.isNotBlank()) { "Category is required" }

        val item = Item(
            ownerId = request.ownerId,
            name = request.name.trim(),
            description = request.description.trim(),
            category = request.category.trim(),
            location = request.location.trim()
        )

        return repository.create(item).toResponse()
    }

    suspend fun getAllItems(): List<ItemResponse> {
        logger.info { "Service: fetching all items" }
        return repository.findAll().map { it.toResponse() }
    }

    suspend fun getItemById(id: String): ItemResponse? {
        logger.info { "Service: fetching item $id" }
        return repository.findById(id)?.toResponse()
    }

    suspend fun getItemsByOwner(ownerId: String): List<ItemResponse> {
        logger.info { "Service: fetching items for owner $ownerId" }
        return repository.findByOwnerId(ownerId).map { it.toResponse() }
    }

    suspend fun getAvailableItems(): List<ItemResponse> {
        logger.info { "Service: fetching available items" }
        return repository.findAvailable().map { it.toResponse() }
    }

    suspend fun getItemsByCategory(category: String): List<ItemResponse> {
        logger.info { "Service: fetching items in category '$category'" }
        return repository.findByCategory(category).map { it.toResponse() }
    }

    suspend fun updateItem(id: String, request: UpdateItemRequest): ItemResponse? {
        logger.info { "Service: updating item $id" }

        val updates = buildMap<String, Any?> {
            request.name?.let { put("name", it.trim()) }
            request.description?.let { put("description", it.trim()) }
            request.category?.let { put("category", it.trim()) }
            request.status?.let { put("status", it) }
            request.location?.let { put("location", it.trim()) }
        }

        return repository.update(id, updates)?.toResponse()
    }

    suspend fun deleteItem(id: String): Boolean {
        logger.info { "Service: deleting item $id" }
        return repository.delete(id)
    }

    suspend fun isItemAvailable(id: String): Boolean {
        val item = repository.findById(id) ?: return false
        return item.status == ItemStatus.AVAILABLE
    }

    suspend fun updateItemStatus(id: String, status: ItemStatus): ItemResponse? {
        logger.info { "Service: updating status of item $id to $status" }
        return repository.updateStatus(id, status)?.toResponse()
    }
}
