const path = require("path");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const env = require("../config/env");
const { createBreaker } = require("../utils/circuitBreaker");

const protoPath = path.join(__dirname, "..", "proto", "item.proto");

const packageDefinition = protoLoader.loadSync(protoPath, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
const itemPackage = protoDescriptor.item;

const client = new itemPackage.ItemService(
  env.itemGrpcUrl,
  grpc.credentials.createInsecure()
);

function mapProtoItem(item) {
  if (!item) {
    return null;
  }

  return {
    id: item.id || "",
    ownerId: item.owner_id || item.ownerId || "",
    name: item.name || "",
    description: item.description || "",
    category: item.category || "",
    status: item.status || "",
    location: item.location || "",
    createdAt: item.created_at || item.createdAt || "",
    updatedAt: item.updated_at || item.updatedAt || ""
  };
}

function unary(methodName, request) {
  return new Promise((resolve, reject) => {
    client[methodName](request, (error, response) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(response);
    });
  });
}

const getAllItemsBreaker = createBreaker(
  "item.getAllItems",
  async () => {
    const response = await unary("GetAllItems", {});
    return response.items.map(mapProtoItem);
  },
  () => []
);

const getAvailableItemsBreaker = createBreaker(
  "item.getAvailableItems",
  async () => {
    const response = await unary("GetAvailableItems", {});
    return response.items.map(mapProtoItem);
  },
  () => []
);

const getItemsByCategoryBreaker = createBreaker(
  "item.getItemsByCategory",
  async (category) => {
    const response = await unary("GetItemsByCategory", {
      category
    });

    return response.items.map(mapProtoItem);
  },
  () => []
);

const getItemsByOwnerBreaker = createBreaker(
  "item.getItemsByOwner",
  async (ownerId) => {
    const response = await unary("GetItemsByOwner", {
      owner_id: ownerId
    });

    return response.items.map(mapProtoItem);
  },
  () => []
);

const getItemBreaker = createBreaker("item.getItem", async (id) => {
  const response = await unary("GetItem", {
    id
  });

  return {
    found: response.found,
    item: mapProtoItem(response.item)
  };
});

const createItemBreaker = createBreaker("item.createItem", async (body) => {
  const response = await unary("CreateItem", {
    owner_id: body.ownerId,
    name: body.name,
    description: body.description,
    category: body.category,
    location: body.location || ""
  });

  return {
    success: response.success,
    message: response.message,
    item: mapProtoItem(response.item)
  };
});

const updateItemBreaker = createBreaker("item.updateItem", async (id, body) => {
  const response = await unary("UpdateItem", {
    id,
    name: body.name || "",
    description: body.description || "",
    category: body.category || "",
    status: body.status || "",
    location: body.location || ""
  });

  return {
    success: response.success,
    message: response.message,
    item: mapProtoItem(response.item)
  };
});

const updateItemStatusBreaker = createBreaker("item.updateItemStatus", async (id, status) => {
  const response = await unary("UpdateItemStatus", {
    id,
    status
  });

  return {
    success: response.success,
    message: response.message,
    item: mapProtoItem(response.item)
  };
});

const deleteItemBreaker = createBreaker("item.deleteItem", async (id) => {
  return unary("DeleteItem", {
    id
  });
});

const checkItemAvailabilityBreaker = createBreaker(
  "item.checkItemAvailability",
  async (id) => {
    return unary("CheckItemAvailability", {
      id
    });
  },
  () => ({
    available: false,
    degraded: true,
    reason: "item-service circuit breaker fallback"
  })
);

const itemGrpcClient = {
  getAllItems: () => getAllItemsBreaker.fire(),
  getAvailableItems: () => getAvailableItemsBreaker.fire(),
  getItemsByCategory: (category) => getItemsByCategoryBreaker.fire(category),
  getItemsByOwner: (ownerId) => getItemsByOwnerBreaker.fire(ownerId),
  getItem: (id) => getItemBreaker.fire(id),
  createItem: (body) => createItemBreaker.fire(body),
  updateItem: (id, body) => updateItemBreaker.fire(id, body),
  updateItemStatus: (id, status) => updateItemStatusBreaker.fire(id, status),
  deleteItem: (id) => deleteItemBreaker.fire(id),
  checkItemAvailability: (id) => checkItemAvailabilityBreaker.fire(id)
};

module.exports = itemGrpcClient;