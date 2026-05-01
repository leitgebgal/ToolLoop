package item.toolloop.com

import item.toolloop.com.model.*
import item.toolloop.com.repository.ItemRepository
import item.toolloop.com.service.ItemService
import io.mockk.*
import kotlinx.coroutines.test.runTest
import org.bson.types.ObjectId
import org.junit.jupiter.api.*
import org.junit.jupiter.api.Assertions.*

@TestMethodOrder(MethodOrderer.OrderAnnotation::class)
class ItemServiceTest {
    private lateinit var repository: ItemRepository
    private lateinit var service: ItemService

    private fun makeItem(
        name: String = "Test Drill",
        ownerId: String = "owner123",
        status: ItemStatus = ItemStatus.AVAILABLE,
        category: String = "Tools"
    ) = Item(
        id = ObjectId(),
        ownerId = ownerId,
        name = name,
        description = "A test item",
        category = category,
        status = status,
        location = "Maribor"
    )

    @BeforeEach
    fun setUp() {
        repository = mockk()
        service = ItemService(repository)
    }

    // ── createItem ──

    @Test
    @Order(1)
    fun `createItem returns ItemResponse on success`() = runTest {
        val item = makeItem()
        val request = CreateItemRequest(
            ownerId = item.ownerId,
            name = item.name,
            description = item.description,
            category = item.category,
            location = item.location
        )

        coEvery { repository.create(any()) } returns item

        val response = service.createItem(request)

        assertEquals(item.name, response.name)
        assertEquals(item.ownerId, response.ownerId)
        assertEquals(ItemStatus.AVAILABLE.name, response.status)
        coVerify(exactly = 1) { repository.create(any()) }
    }

    @Test
    @Order(2)
    fun `createItem throws when name is blank`() = runTest {
        val request = CreateItemRequest(
            ownerId = "owner123",
            name = "  ",
            description = "desc",
            category = "Tools"
        )

        assertThrows<IllegalArgumentException> {
            service.createItem(request)
        }

        coVerify(exactly = 0) { repository.create(any()) }
    }

    @Test
    @Order(3)
    fun `createItem throws when ownerId is blank`() = runTest {
        val request = CreateItemRequest(
            ownerId = "",
            name = "Drill",
            description = "desc",
            category = "Tools"
        )

        assertThrows<IllegalArgumentException> {
            service.createItem(request)
        }
    }

    // ── getAllItems ──

    @Test
    @Order(4)
    fun `getAllItems returns mapped list`() = runTest {
        val items = listOf(makeItem("Drill"), makeItem("Ladder"))
        coEvery { repository.findAll() } returns items

        val result = service.getAllItems()

        assertEquals(2, result.size)
        assertEquals("Drill", result[0].name)
        assertEquals("Ladder", result[1].name)
    }

    @Test
    @Order(5)
    fun `getAllItems returns empty list when no items`() = runTest {
        coEvery { repository.findAll() } returns emptyList()

        val result = service.getAllItems()

        assertTrue(result.isEmpty())
    }

    // ── getItemById ──

    @Test
    @Order(6)
    fun `getItemById returns item when found`() = runTest {
        val item = makeItem()
        coEvery { repository.findById(item.id.toHexString()) } returns item

        val result = service.getItemById(item.id.toHexString())

        assertNotNull(result)
        assertEquals(item.name, result!!.name)
    }

    @Test
    @Order(7)
    fun `getItemById returns null when not found`() = runTest {
        coEvery { repository.findById(any()) } returns null

        val result = service.getItemById("nonexistent-id")

        assertNull(result)
    }

    // ── getItemsByOwner ──

    @Test
    @Order(8)
    fun `getItemsByOwner returns items for given owner`() = runTest {
        val ownerId = "owner123"
        val items   = listOf(makeItem(ownerId = ownerId), makeItem(name = "Ladder", ownerId = ownerId))
        coEvery { repository.findByOwnerId(ownerId) } returns items

        val result = service.getItemsByOwner(ownerId)

        assertEquals(2, result.size)
        assertTrue(result.all { it.ownerId == ownerId })
    }

    // ── getAvailableItems ──

    @Test
    @Order(9)
    fun `getAvailableItems returns only available items`() = runTest {
        val available = listOf(makeItem(status = ItemStatus.AVAILABLE))
        coEvery { repository.findAvailable() } returns available

        val result = service.getAvailableItems()

        assertEquals(1, result.size)
        assertEquals(ItemStatus.AVAILABLE.name, result[0].status)
    }

    // ── updateItem ──

    @Test
    @Order(10)
    fun `updateItem returns updated item`() = runTest {
        val item    = makeItem()
        val updated = item.copy(name = "Updated Drill")
        val request = UpdateItemRequest(name = "Updated Drill")

        coEvery { repository.update(item.id.toHexString(), any()) } returns updated

        val result = service.updateItem(item.id.toHexString(), request)

        assertNotNull(result)
        assertEquals("Updated Drill", result!!.name)
    }

    @Test
    @Order(11)
    fun `updateItem returns null when item not found`() = runTest {
        val request = UpdateItemRequest(name = "New Name")
        coEvery { repository.update(any(), any()) } returns null

        val result = service.updateItem("missing-id", request)

        assertNull(result)
    }

    // ── deleteItem ──

    @Test
    @Order(12)
    fun `deleteItem returns true on success`() = runTest {
        val item = makeItem()
        coEvery { repository.delete(item.id.toHexString()) } returns true

        val result = service.deleteItem(item.id.toHexString())

        assertTrue(result)
    }

    @Test
    @Order(13)
    fun `deleteItem returns false when item not found`() = runTest {
        coEvery { repository.delete(any()) } returns false

        val result = service.deleteItem("missing-id")

        assertFalse(result)
    }

    // ── isItemAvailable ──

    @Test
    @Order(14)
    fun `isItemAvailable returns true for AVAILABLE item`() = runTest {
        val item = makeItem(status = ItemStatus.AVAILABLE)
        coEvery { repository.findById(item.id.toHexString()) } returns item

        assertTrue(service.isItemAvailable(item.id.toHexString()))
    }

    @Test
    @Order(15)
    fun `isItemAvailable returns false for BORROWED item`() = runTest {
        val item = makeItem(status = ItemStatus.BORROWED)
        coEvery { repository.findById(item.id.toHexString()) } returns item

        assertFalse(service.isItemAvailable(item.id.toHexString()))
    }

    @Test
    @Order(16)
    fun `isItemAvailable returns false when item does not exist`() = runTest {
        coEvery { repository.findById(any()) } returns null

        assertFalse(service.isItemAvailable("ghost-id"))
    }

    // ── updateItemStatus ──

    @Test
    @Order(17)
    fun `updateItemStatus updates correctly`() = runTest {
        val item    = makeItem(status = ItemStatus.AVAILABLE)
        val updated = item.copy(status = ItemStatus.BORROWED)
        coEvery { repository.updateStatus(item.id.toHexString(), ItemStatus.BORROWED) } returns updated

        val result = service.updateItemStatus(item.id.toHexString(), ItemStatus.BORROWED)

        assertNotNull(result)
        assertEquals(ItemStatus.BORROWED.name, result!!.status)
    }
}