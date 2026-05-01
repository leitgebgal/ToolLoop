package item.toolloop.com.model

import kotlinx.serialization.Contextual
import kotlinx.serialization.Serializable
import org.bson.codecs.pojo.annotations.BsonId
import org.bson.types.ObjectId
import java.time.Instant

enum class ItemStatus {
    AVAILABLE, BORROWED, UNAVAILABLE
}

@Serializable
data class Item(
    @Contextual
    @BsonId
    val id: ObjectId = ObjectId(),

    val ownerId: String,
    val name: String,
    val description: String,
    val category: String,
    val status: ItemStatus = ItemStatus.AVAILABLE,
    val location: String = "",

    val createdAt: String = Instant.now().toString(),
    val updatedAt: String = Instant.now().toString()
)

@Serializable
data class CreateItemRequest(
    val ownerId: String,
    val name: String,
    val description: String,
    val category: String,
    val location: String = ""
)

@Serializable
data class UpdateItemRequest(
    val name: String? = null,
    val description: String? = null,
    val category: String? = null,
    val status: ItemStatus? = null,
    val location: String? = null
)

@Serializable
data class ItemResponse(
    val id: String,
    val ownerId: String,
    val name: String,
    val description: String,
    val category: String,
    val status: String,
    val location: String,
    val createdAt: String,
    val updatedAt: String
)

fun Item.toResponse() = ItemResponse(
    id = id.toHexString(),
    ownerId = ownerId,
    name = name,
    description = description,
    category = category,
    status = status.name,
    location = location,
    createdAt = createdAt,
    updatedAt = updatedAt
)