// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  let [owner, notLister, lister, acc1, acc2, acc3] =
    await hre.ethers.getSigners();

  const ERC721Mock = await hre.ethers.getContractFactory("ERC721Mock");
  const ERC1155Mock = await hre.ethers.getContractFactory("ERC1155Mock");
  const Multiplace = await hre.ethers.getContractFactory("Multiplace");

  let ff721Addr = "0x970A153eb7957F86ea9135C1679e32F5B090fBB9";
  let ff1155Addr = "0x29947f9679E177FaAAF23D4C0C9C126f1fb4bd82";

  let multiplaceAddr = "0x8b7647a419c25f15115A323cbbd7d00564C2944D";
  let usdc = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";

  // let nftContract = await ERC721Mock.attach(ff721Addr);
  let nftContract = await ERC1155Mock.attach(ff1155Addr);

  let multiplace = await Multiplace.attach(multiplaceAddr);

  await nftContract.connect(owner).setApprovalForAll(multiplace.address, true);
  await sleep(3000);

  let tokenAddr = nftContract.address;
  let tokenId = 2;
  let amount = 20;
  let unitPrice = 1e6;
  let paymentToken = usdc;

  // for (let tokenId = 1; tokenId < 10; tokenId++) {
  //     console.log(`Listing token ${tokenId}...`);

  await multiplace
    .connect(owner)
    .list(tokenAddr, tokenId, amount, unitPrice, paymentToken);

  await sleep(3000);
  // }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
