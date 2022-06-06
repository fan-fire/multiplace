const { ethers } = require("hardhat");

Array.prototype.forEachAsync = async function (fn) {
  for (let t of this) {
    await fn(t);
  }
};

const listingToObject = (listing) => {
  return {
    listPtr: listing.listPtr.toNumber(),
    tokenAddr: listing.tokenAddr,
    tokenId: listing.tokenId.toNumber(),
    seller: listing.seller,
    unitPrice: listing.unitPrice.toString(),
    amount: listing.amount.toNumber(),
    paymentToken: listing.paymentToken,
    nftType: listing.nftType,
    reservedUntil: listing.reservedUntil.toNumber(),
    reservedFor: listing.reservedFor,
  };
};

const DEFAULT_ADMIN_ROLE = ethers.utils.formatBytes32String(0);
const ADMIN_ROLE = ethers.utils.solidityKeccak256(["string"], ["ADMIN_ROLE"]);
const RESERVER_ROLE = ethers.utils.solidityKeccak256(
  ["string"],
  ["RESERVER_ROLE"]
);
const PROTOCOL_FEE_DEN = ethers.BigNumber.from("100000000000000");
const PROTOCOL_FEE_NUM = ethers.BigNumber.from("2500000000000");

const NFT_TYPE = {
  ERC721: 0,
  ERC721_2981: 1,
  ERC1155: 2,
  ERC1155_2981: 3,
};

module.exports = {
  NFT_TYPE,
  listingToObject,
  DEFAULT_ADMIN_ROLE,
  ADMIN_ROLE,
  RESERVER_ROLE,
  PROTOCOL_FEE_DEN,
  PROTOCOL_FEE_NUM,
};
