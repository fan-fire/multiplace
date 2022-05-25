const listingToObject = (listing) => {
  return {
    listPtr: listing.listPtr.toNumber(),
    tokenAddr: listing.tokenAddr,
    tokenId: listing.tokenId.toNumber(),
    seller: listing.seller,
    unitPrice: listing.unitPrice.toNumber(),
    amount: listing.amount.toNumber(),
    paymentToken: listing.paymentToken,
    nftType: listing.nftType,
    reservedUntil: listing.reservedUntil.toNumber(),
    reservedFor: listing.reservedFor,
  };
};

const NFT_TYPE = {
  ERC721: 0,
  ERC721_2981: 1,
  ERC1155: 2,
  ERC1155_2981: 3,
};

module.exports = {
  NFT_TYPE,
  listingToObject,
};
