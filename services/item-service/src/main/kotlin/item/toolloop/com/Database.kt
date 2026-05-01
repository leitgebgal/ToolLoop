package item.toolloop.com

import item.toolloop.com.model.Item
import mu.KotlinLogging
import org.litote.kmongo.coroutine.CoroutineCollection
import org.litote.kmongo.coroutine.CoroutineDatabase
import org.litote.kmongo.coroutine.coroutine
import org.litote.kmongo.reactivestreams.KMongo

private val logger = KotlinLogging.logger {}

object Database {
    private lateinit var database: CoroutineDatabase

    fun connect(uri: String): CoroutineDatabase {
        logger.info { "Connecting to MongoDB at: $uri" }
        val client = KMongo.createClient(uri).coroutine
        database = client.getDatabase("items-db")
        logger.info { "MongoDB connected!" }
        return database
    }

    fun itemCollection(): CoroutineCollection<Item> =
        database.getCollection<Item>("items")
}