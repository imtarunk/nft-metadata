const express = require("express");
const mongoose = require("mongoose");
const { Web3 } = require("web3");
const fetch = require("node-fetch"); // Import node-fetch for use in Node.js
const { NFTMetadata, IPFSData, Transaction } = require("./config/db"); // Mongoose models

require("dotenv").config();

const app = express();
app.use(express.json());

// Ensure required environment variables are set
if (!process.env.ALCHEMY_URL || !process.env.MONGO_URI || !process.env.PORT) {
  console.error("Missing required environment variables.");
  process.exit(1);
}

// Define the ABIs before using them
const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
];

const NFT_ABI = [
  // Define the ABI for your NFT contract here
  {
    constant: true,
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "tokenURI",
    outputs: [{ name: "", type: "string" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
];

// Initialize Web3
const web3 = new Web3(process.env.ALCHEMY_URL);
const tokenContract = new web3.eth.Contract(
  ERC20_ABI,
  process.env.TOKEN_CONTRACT_ADDRESS
);

// Connect to Alchemy
web3.eth.net
  .isListening()
  .then(() => console.log("Connected to Alchemy"))
  .catch((e) => console.log("Error connecting to Alchemy", e));

// 1. NFT Metadata Retrieval and Storage
app.get("/nft-metadata", async (req, res) => {
  const { contractAddress, tokenId } = req.query;

  // Validate request parameters
  if (!contractAddress || !tokenId) {
    return res
      .status(400)
      .json({ error: "contractAddress and tokenId are required." });
  }

  const contract = new web3.eth.Contract(NFT_ABI, contractAddress);

  try {
    const metadata = await contract.methods.tokenURI(tokenId).call();
    const response = await fetch(metadata);

    if (!response.ok) {
      throw new Error(`Failed to fetch metadata: ${response.statusText}`);
    }

    const json = await response.json();

    // Save to MongoDB
    const nft = new NFTMetadata(json);
    await nft.save();

    res.status(200).json(json);
  } catch (error) {
    console.error("Error fetching NFT metadata:", error);
    res.status(500).json({
      error: "Failed to retrieve NFT metadata",
      details: error.message,
    });
  }
});

// 2. Token Balance Lookup
app.get("/token-balance", async (req, res) => {
  const { contractAddress, walletAddress } = req.query;

  // Check if contractAddress and walletAddress are provided
  if (!contractAddress || !walletAddress) {
    return res
      .status(400)
      .json({ error: "contractAddress and walletAddress are required." });
  }

  const contract = new web3.eth.Contract(ERC20_ABI, contractAddress);

  try {
    const balance = await contract.methods.balanceOf(walletAddress).call();
    res.status(200).json({ balance });
  } catch (error) {
    console.error("Error retrieving token balance:", error);
    res.status(500).json({
      error: "Failed to retrieve token balance",
      details: error.message,
    });
  }
});

// IPFS retrieval endpoint (make sure IPFS client is initialized)
// Add your IPFS client setup here, for example:
// const { create } = require('ipfs-http-client');
// const ipfs = create({ url: 'https://ipfs.infura.io:5001/api/v0' });

app.get("/ipfs/:hash", async (req, res) => {
  const { hash } = req.params;

  try {
    const stream = ipfs.cat(hash); // Make sure ipfs is initialized
    let data = "";

    for await (const chunk of stream) {
      data += chunk.toString();
    }

    res.status(200).send(data);
  } catch (error) {
    console.error("Error retrieving from IPFS:", error);
    res
      .status(500)
      .json({ error: "Failed to retrieve from IPFS", details: error.message });
  }
});

// Transfer endpoint
app.post("/transfer", async (req, res) => {
  const { from, to, amount } = req.body;

  try {
    const gasPrice = await web3.eth.getGasPrice();
    const gasEstimate = await tokenContract.methods
      .transfer(to, amount)
      .estimateGas({ from });

    const tx = {
      from,
      to: process.env.TOKEN_CONTRACT_ADDRESS,
      data: tokenContract.methods.transfer(to, amount).encodeABI(),
      gas: gasEstimate,
      gasPrice: gasPrice,
    };

    const signedTx = await web3.eth.accounts.signTransaction(
      tx,
      process.env.PRIVATE_KEY
    );
    const receipt = await web3.eth.sendSignedTransaction(
      signedTx.rawTransaction
    );

    // Save transaction to MongoDB
    const transaction = new Transaction({
      from,
      to,
      amount,
      transactionHash: receipt.transactionHash,
    });
    await transaction.save();

    res
      .status(200)
      .json({ success: true, transactionHash: receipt.transactionHash });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Express server and mongoose connect
const main = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    app.listen(process.env.PORT, () => {
      console.log(`Server running on port ${process.env.PORT}`);
    });
  } catch (error) {
    console.error("MongoDB connection error:", error);
  }
};

main();
