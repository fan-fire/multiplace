const {
  BN, // Big Number support
  constants, // Common constants, like the zero address and largest integers
  expectEvent, // Assertions for emitted events
  expectRevert, // Assertions for transactions that should fail
} = require('@openzeppelin/test-helpers');

const {
  NFT_TYPE
} = require('./utils');

describe.skip('Events', async (accounts) => {

  beforeEach(async () => {});
  it('should emit a Listed event correctly when listing an ERC721', async () => {});
  it('should emit a Listed event correctly when listing an ERC1155', async () => {});
  it('should emit a Listed event correctly when listing an ERC721 With ERC2981', async () => {});
  it('should emit a Listed event correctly when listing an ERC1155 With ERC2981', async () => {});
  it('should emit a Bought event for ERC721 with ERC20', async () => {});
  it('should emit a Bought event for ERC1155 with ERC20', async () => {});
  it('should emit a Bought event for ERC721 with ERC2891 with ERC20', async () => {});
  it('should emit a Bought event for ERC1155 with ERC2891 with ERC20', async () => {});
  it('should emit a PaymentTokenAdded event', async () => {});
  it('should emit a FundsWithdrawn event for ERC20 withdrawal', async () => {});
  it('should emit a RoyaltiesSet event', async () => {});
  it('should emit a Unlisted event when unlisting', async () => {});
  it('should emit a Unlisted event when buying', async () => {});
  it('should emit event when paused', async () => {});
  it('should emit event when unpaused', async () => {});
  it('should emit UnlistStale when stale NFT is unlisted', async () => {});
  it('should emit a RoyaltiesSet event when listing', async () => {});
  it('should emit Reserved when token is reserved', async () => {});
});