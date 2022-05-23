const {
  BN, // Big Number support
  constants, // Common constants, like the zero address and largest integers
  expectEvent, // Assertions for emitted events
  expectRevert, // Assertions for transactions that should fail
} = require('@openzeppelin/test-helpers');

const {
  NFT_TYPE
} = require('./utils');

describe.skip('Listing', async (accounts) => {

  beforeEach(async () => {

  });
  it('addrSeller1 is the owner of all 4 NFTs set up in before each', async () => {});
  it('can list ERC721 with ERC291 with ERC20', async () => {});
  it('can list ERC1155 with ERC291 with ERC20', async () => {});
  it('fails if NFT does not support 165', async () => {});
  it('fails if nftAddress is not ERC721 or ERC1155, but supports ERC165', async () => {});
  it('fails if tokenId is not owned by seller', async () => {});
  it('fails if tokenId is not owned by seller', async () => {});
  it('fails if tokenId of ERC721 is not approved for all by seller', async () => {});
  it('fails if tokenId of ERC1155 is not approved for all by seller', async () => {});
  it('fails if price is 0 for ERC721', async () => {});
  it('fails if price is 0 for ERC1155', async () => {});
  it('fails if paymentToken is not in approved ERC20 list', async () => {});
  it('Royalties are correctly set for ERC721 if listing supports ERC2981', async () => {});
  it('Royalties are correctly set for ERC1155 if listing supports ERC2981', async () => {});
  it('Royalties are correctly set if listing does not support ERC2981, but ERC721 has owner', async () => {});
  it('Royalties are correctly set if listing does not support ERC2981, but ERC1155 has owner', async () => {});
  it('Royalties are correctly set if listing does not support ERC2981 and but ERC721 does not have an owner', async () => {});
  it('Royalties are correctly set if listing does not support ERC2981 and but ERC1155 does not have an owner', async () => {});
  it('allListings updated correctly if 3 ERC721 items are listed', async () => {});
  it('allListings updated correctly if 4 ERC721 items are listed, 2 from seller 1, 2 from seller 2', async () => {});
  it('allListings update correctly if 5 items are listed, and 2 sold', async () => {});
});