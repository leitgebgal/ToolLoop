package item.toolloop.com

import item.toolloop.com.model.Item
import item.toolloop.com.model.ItemStatus
import item.toolloop.com.model.toResponse
import org.bson.types.ObjectId
import org.junit.jupiter.api.*
import org.junit.jupiter.api.Assertions.*

class ItemModelTest {
    private fun makeItem(name: String = "Drill", status: ItemStatus = ItemStatus.AVAILABLE) = Item(
        id = ObjectId(),
        ownerId = "owner-abc",
        name = name,
        description = "A useful tool",
        category = "Tools",
        status = status,
        location = "Ljubljana"
    )

    @Test
    fun `toResponse maps all fields correctly`() {
        val item     = makeItem()
        val response = item.toResponse()

        assertEquals(item.id.toHexString(), response.id)
        assertEquals(item.ownerId, response.ownerId)
        assertEquals(item.name, response.name)
        assertEquals(item.description, response.description)
        assertEquals(item.category, response.category)
        assertEquals(item.status.name, response.status)
        assertEquals(item.location, response.location)
        assertEquals(item.createdAt, response.createdAt)
        assertEquals(item.updatedAt, response.updatedAt)
    }

    @Test
    fun `default status is AVAILABLE`() {
        val item = makeItem()
        assertEquals(ItemStatus.AVAILABLE, item.status)
    }

    @Test
    fun `item id is unique per instance`() {
        val a = makeItem()
        val b = makeItem()
        assertNotEquals(a.id, b.id)
    }

    @Test
    fun `BORROWED status is mapped correctly`() {
        val item = makeItem(status = ItemStatus.BORROWED)
        val response = item.toResponse()
        assertEquals("BORROWED", response.status)
    }

    @Test
    fun `UNAVAILABLE status is mapped correctly`() {
        val item = makeItem(status = ItemStatus.UNAVAILABLE)
        val response = item.toResponse()
        assertEquals("UNAVAILABLE", response.status)
    }

    @Test
    fun `createdAt and updatedAt are set on creation`() {
        val item = makeItem()
        assertNotNull(item.createdAt)
        assertNotNull(item.updatedAt)
        assertTrue(item.createdAt.isNotBlank())
        assertTrue(item.updatedAt.isNotBlank())
    }

    @Test
    fun `item name is preserved as-is`() {
        val item = makeItem(name = "High-Pressure Washer")
        assertEquals("High-Pressure Washer", item.name)
    }
}