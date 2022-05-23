const {
  BN, // Big Number support
  constants, // Common constants, like the zero address and largest integers
  expectEvent, // Assertions for emitted events
  expectRevert, // Assertions for transactions that should fail
} = require('@openzeppelin/test-helpers');

const {
  NFT_TYPE
} = require('./utils');

describe.skip('Buying', async (accounts) => {

  beforeEach(async () => {
   
  });
  it('addrSeller1 is the owner of all 4 NFTs set up in before each', async () => {});
    it('4 listings look as expected', async () => {});
    it('buyer 1 and buyer 2 should both have 10 ether of erc20', async () => {});
    it('can buy ERC721 using ERC20', async () => {});
    it('can buy ERC1155 using ERC20', async () => {});
    it('can buy ERC721_2981 using ERC20', async () => {});
    it('should fail if original seller does not own the token anymore and the token is bought for ERC721', async () => {});
    it('should fail if original seller removed approval after listing and token is bought for ERC721', async () => {});
    it('should fail if original seller does not own the token anymore and the token is bought for ERC1155', async () => {});
    it('should fail and unlist item if original seller removed the approve for ERC1155', async () => {});
    xit('fails if NFT not listed', async () => {});
    xit("fails if buyer doens't have enough ERC20 balance", async () => {});
});
