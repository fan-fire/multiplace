const {
  BN, // Big Number support
  expectRevert, // Assertions for transactions that should fail
  time, // Time helpers
} = require('@openzeppelin/test-helpers');
const {
  NFT_TYPE
} = require('./utils');


describe.skip('Royalties', async (accounts) => {

  beforeEach(async () => {

  });
  it('can list ERC721 with ERC291 with ERC20', async () => {});
  it('royalties should be correctly set on the marketplace for 721 with 2981', async () => {});
  it('royalties should be correctly set on the marketplace for 1155 with 2981', async () => {});
  it('2891 set royalties should update based on NFTs royalties for 721', async () => {});
  it('2891 set royalties should update based on NFTs royalties for 1155', async () => {});
  it('can update royalties if you are the owner for 721 when not 2981', async () => {});
  it('can update royalties if you are the owner for 1155 when not 2981', async () => {});
  it('can not update if no owner and not 2981 for 721', async () => {});
  it('can not update if no owner and not 2981 for 1155', async () => {});
  it('royalties set for opensea for 721', async () => {});
  it('royalties set for opensea for 1155', async () => {});
});