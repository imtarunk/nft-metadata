const mongoose = require("mongoose");

const nftMetadataSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  imageUrl: {
    type: String,
    required: true,
  },
  // Optionally, you can add more fields like attributes, creator, etc.
  attributes: {
    type: Array, // For storing attributes related to the NFT
    default: [],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Create a model based on the schema
const NFTMetadata = mongoose.model("NFTMetadata", nftMetadataSchema);

module.exports = NFTMetadata;
