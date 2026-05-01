package item.toolloop.com.repository

import item.toolloop.com.model.Item
import item.toolloop.com.model.ItemStatus
import mu.KotlinLogging
import org.bson.types.ObjectId
import org.litote.kmongo.coroutine.CoroutineCollection
import org.litote.kmongo.eq
import java.time.Instant

private val logger = KotlinLogging.logger {}

class ItemRepository(private val collection: CoroutineCollection<Item>) {

    suspend fun create(item: Item): Item {
        logger.info { "Creating item: ${item.name} for owner: ${item.ownerId}" }
        collection.insertOne(item)
        return item
    }

    suspend fun findAll(): List<Item> {
        logger.info { "Fetching all items" }
        return collection.find().toList()
    }

    suspend fun findById(id: String): Item? {
        logger.info { "Fetching item by ID: $id" }
        return try {
            collection.findOneById(ObjectId(id))
        } catch (e: IllegalArgumentException) {
            logger.warn { "Invalid ObjectId format: $id" }
            null
        }
    }

    suspend fun findByOwnerId(ownerId: String): List<Item> {
        logger.info { "Fetching items for owner: $ownerId" }
        return collection.find(Item::ownerId eq ownerId).toList()
    }

    suspend fun findByCategory(category: String): List<Item> {
        logger.info { "Fetching items by category: $category" }
        return collection.find(Item::category eq category).toList()
    }

    suspend fun findAvailable(): List<Item> {
        logger.info { "Fetching all available items" }
        return collection.find(Item::status eq ItemStatus.AVAILABLE).toList()
    }

    suspend fun update(id: String, updates: Map<String, Any?>): Item? {
        logger.info { "Updating item: $id" }
        val existing = findById(id) ?: return null

        val updated = existing.copy(
            name = updates["name"] as? String ?: existing.name,
            description = updates["description"] as? String ?: existing.description,
            category = updates["category"] as? String ?: existing.category,
            status = updates["status"] as? ItemStatus ?: existing.status,
            location = updates["location"] as? String ?: existing.location,
            updatedAt = Instant.now().toString()
        )

        collection.replaceOneById(ObjectId(id), updated)
        return updated
    }

    suspend fun updateStatus(id: String, status: ItemStatus): Item? {
        logger.info { "Updating status of item $id to $status" }
        return update(id, mapOf("status" to status))
    }

    suspend fun delete(id: String): Boolean {
        logger.info { "Deleting item: $id" }
        return try {
            val result = collection.deleteOneById(ObjectId(id))
            result.deletedCount > 0
        } catch (e: IllegalArgumentException) {
            logger.warn { "Invalid ObjectId for deletion: $id" }
            false
        }
    }
}