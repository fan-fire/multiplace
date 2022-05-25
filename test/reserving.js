const {
  BN, // Big Number support
  expectRevert, // Assertions for transactions that should fail
  time, // Time helpers
} = require("@openzeppelin/test-helpers");
const { NFT_TYPE } = require("./utils");

describe.skip("Reserving", async (accounts) => {
  beforeEach(async () => {});
  it("addrSeller1 is the owner of all 4 NFTs set up in before each", async () => {});
  it("can buy 721 if not reserved", async () => {});
  it("can buy 1155 if not reserved", async () => {});
  it("can't buy 721 if reserved", async () => {});
  it("can't buy 1155 if reserved", async () => {});
  it("can buy 721 if reserved with reservedFor account", async () => {});
  it("can buy 1155 if reserved with reservedFor account", async () => {});
  it("can buy 721 if reserved with any account if reserve period has passed", async () => {});
  it("can buy 1155 if reserved with any account if reserve period has passed", async () => {});
  it("fails if you don't have rerver role", async () => {});
  it("can't set period greater than MAX_RESERVE_PERIOD", async () => {});
});
