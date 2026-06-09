const path = require("path");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const env = require("../config/env");

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

const itemGrpcClient = {
  async getAllItems() {
    const response = await unary("GetAllItems", {});
    return response.items.map(mapProtoItem);
  },

  async getAvailableItems() {
    const response = await unary("GetAvailableItems", {});
    return response.items.map(mapProtoItem);
  },

  async getItemsByCategory(category) {
    const response = await unary("GetItemsByCategory", {
      category
    });

    return response.items.map(mapProtoItem);
  },

  async getItemsByOwner(ownerId) {
    const response = await unary("GetItemsByOwner", {
      owner_id: ownerId
    });

    return response.items.map(mapProtoItem);
  },

  async getItem(id) {
    const response = await unary("GetItem", {
      id
    });

    return {
      found: response.found,
      item: mapProtoItem(response.item)
    };
  },

  async createItem(body) {
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
  },

  async updateItem(id, body) {
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
  },

  async updateItemStatus(id, status) {
    const response = await unary("UpdateItemStatus", {
      id,
      status
    });

    return {
      success: response.success,
      message: response.message,
      item: mapProtoItem(response.item)
    };
  },

  async deleteItem(id) {
    return unary("DeleteItem", {
      id
    });
  },

  async checkItemAvailability(id) {
    return unary("CheckItemAvailability", {
      id
    });
  }
};

module.exports = itemGrpcClient;