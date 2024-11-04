const express = require("express");
const mongoose = require("mongoose");
const { Web3 } = require("web3");
const NFTMetadata = require("./config/db"); // Mongoose model

require("dotenv").config();

const app = express();
const web3 = new Web3(process.env.ALCHEMY_URL);

web3.eth.net
  .isListening()
  .then(() => console.log("Connected to Alchemy"))
  .catch((e) => console.log("Error connecting to Alchemy", e));

app.get("/nft-metadata", async (req, res) => {
  const { contractAddress, tokenId } = req.query;
  const contract = new web3.eth.Contract(NFT_ABI, contractAddress);

  try {
    const metadata = await contract.methods.tokenURI(tokenId).call();
    const response = await fetch(metadata);
    const json = await response.json();

    // Save to MongoDB
    const nft = new NFTMetadata(json);
    await nft.save();

    res.json(json);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

const main = () => {
  mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log("Connected to MongoDB"))
    .catch((error) => console.error("MongoDB connection error:", error));

  app.listen(process.env.PORT, () =>
    console.log("Server running on port 3000")
  );
};

main();
