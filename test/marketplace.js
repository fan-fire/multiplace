const {
  BN, // Big Number support
  constants, // Common constants, like the zero address and largest integers
  expectEvent, // Assertions for emitted events
  expectRevert, // Assertions for transactions that should fail
} = require('@openzeppelin/test-helpers');

const {
  NFT_TYPE
} = require('./utils');

describe.skip('Marketplace', async (accounts) => {

  beforeEach(async () => {

  });
  it("can't list 0x00 address for payment token", async () => {});
  it('only the seller can unlist 721', async () => {});
  it('only the seller can unlist 1155', async () => {});
  it('can get the correct marketplace balance for a given address', async () => {});
  it('can pull funds for erc20 correctly', async () => {});
  it('fails if no pullFunds available', async () => {});
  it('pullFunds fails if erc20 token not added supported', async () => {});
  it('pullFunds fail if amount is 0', async () => {});
  it('can add ERC20 for payment token correctly', async () => {});
  it("front runner can't withdraw funds", async () => {});
  it('getListingPointer works as expected', async () => {});
  it('isListed works as expected', async () => {});
  it('getListingByPointer works as expected', async () => {});
  it("can't unlistStale if token is still owned and approved by seller or buyer", async () => {});
  it("can't unlist if token is reserved", async () => {});
  it('can unlist if token is not reserved', async () => {});
  it('can unlist if reserved time has passed', async () => {});
  it('getReservedState resturns correct state', async () => {});
});