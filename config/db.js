const mongoose = require("mongoose");

// Define the schema for NFT Metadata
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

// Define the schema for IPFS Data
const ipfsDataSchema = new mongoose.Schema({
  hash: { type: String, required: true },
  text: { type: String, required: true },
});

const transactionSchema = new mongoose.Schema({
  from: String,
  to: String,
  amount: Number,
  transactionHash: String,
});
// Create models based on the schemas
const NFTMetadata = mongoose.model("NFTMetadata", nftMetadataSchema);
const IPFSData = mongoose.model("IPFSData", ipfsDataSchema);
const Transaction = mongoose.model("Transaction", transactionSchema);

// Export both models
module.exports = { NFTMetadata, IPFSData, Transaction };
