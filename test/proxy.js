const {
  BN, // Big Number support
  constants, // Common constants, like the zero address and largest integers
  expectEvent, // Assertions for emitted events
  expectRevert, // Assertions for transactions that should fail
} = require("@openzeppelin/test-helpers");

const { NFT_TYPE } = require("./utils");

describe.skip("Proxy", async (accounts) => {
  beforeEach(async () => {});
  it("addrSeller1 is the owner of all 4 NFTs set up in before each", async () => {});
  it("can mint a new marketplace, update the proxy, and listings stay the same", async () => {});
  it("can't upgrade if not the owner", async () => {});
  it("Can load an altered Marketplace Proxy, list another item, upgrade to an see both previous proxy's listings", async () => {});
});
