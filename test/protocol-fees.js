const {
  BN, // Big Number support
  constants, // Common constants, like the zero address and largest integers
  expectEvent, // Assertions for emitted events
  expectRevert, // Assertions for transactions that should fail
} = require('@openzeppelin/test-helpers');

const {
  NFT_TYPE
} = require('./utils');

describe.skip('Protocol Fees', async (accounts) => {

  beforeEach(async () => {

  });
  it('should calculate the correct "inclusive" fees for no artist fees', async () => {});
  it('should calculate the correct "inclusive" fees for artist fees', async () => {});
  it('addrSeller1 is the owner of all 4 NFTs set up in before each', async () => {});
  it('only owner can update the protocol wallet', async () => {});
  it('new protocol wallet can not be the zero address', async () => {});
  it('protocol amount is updated correctly after changing numerator and denominator', async () => {});
  it('denominator can not be zero', async () => {});
  it('event is emitted when the protocol wallet is updated', async () => {});
  it('event is emitted when the protocol fee changed', async () => {});
});