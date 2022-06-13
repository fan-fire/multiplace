const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
  constants, // Common constants, like the zero address and largest integers
} = require("@openzeppelin/test-helpers");

const { NFT_TYPE, listingToObject } = require("./utils");

Array.prototype.forEachAsync = async function (fn) {
  for (let t of this) {
    await fn(t);
  }
};

describe("Events", async () => {
  let owner;
  let notLister;
  let lister;
  let acc1;
  let acc2;
  let acc3;

  let multiplace;
  let multiplaceProxy;
  let erc20Mock;

  beforeEach(async () => {
    [owner, notLister, lister, acc1, acc2, acc3] = await ethers.getSigners();

    const Multiplace = await ethers.getContractFactory("Multiplace");
    multiplace = await Multiplace.deploy();
    await multiplace.deployed();

    const MultiplaceProxy = await ethers.getContractFactory("MultiplaceProxy");
    multiplaceProxy = await MultiplaceProxy.deploy(multiplace.address);
    await multiplaceProxy.deployed();

    multiplace = Multiplace.attach(multiplaceProxy.address);

    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    erc20Mock = await ERC20Mock.deploy();
    await erc20Mock.deployed();
    // add erc20 as payment token
    await multiplace.connect(owner).addPaymentToken(erc20Mock.address);
  });

  it("should emit a Listed event correctly when listing an ERC721", async () => {
    const ERC721 = await ethers.getContractFactory("ERC721Mock");
    erc721Mock = await ERC721.deploy();
    await erc721Mock.deployed();
    await erc721Mock.mint(lister.address);
    let tokenId = 0;
    let tokenAddr = erc721Mock.address;

    await erc721Mock
      .connect(lister)
      .setApprovalForAll(multiplace.address, true);

    let listPtr = 0;
    let seller = lister.address;
    let unitPrice = 10;
    let amount = 1;
    let paymentToken = erc20Mock.address;
    let nftType = NFT_TYPE.ERC721;
    let royaltyReceiver = owner.address;
    let unitRoyaltyAmount = 0;


    await expect(
      multiplace
        .connect(lister)
        .list(tokenAddr, tokenId, amount, unitPrice, paymentToken)
    )
      .to.emit(multiplace, "Listed")
      .withArgs(
        listPtr,
        tokenAddr,
        tokenId,
        seller,
        unitPrice,
        amount,
        paymentToken,
        nftType,
        royaltyReceiver,
        unitRoyaltyAmount
      );
  });

  xit("should emit a Listed event correctly when listing an ERC721 With ERC2981", async () => {
    let ERC721WithERC2981Mock = await ethers.getContractFactory(
      "ERC721WithERC2981Mock"
    );
    erc721With2981Mock = await ERC721WithERC2981Mock.deploy();
    await erc721With2981Mock.deployed();
    await erc721With2981Mock.mint(lister.address);
    let tokenId = 0;
    let tokenAddr = erc721With2981Mock.address;
  });
  xit("should emit a Listed event correctly when listing an ERC721 without owner", async () => {
    let ERC721WithoutOwnerMock = await ethers.getContractFactory(
      "ERC721WithoutOwnerMock"
    );
    erc721WithoutOwnerMock = await ERC721WithoutOwnerMock.deploy();
    await erc721WithoutOwnerMock.deployed();
    await erc721WithoutOwnerMock.mint(lister.address);
    let tokenId = 0;
    let tokenAddr = erc721WithoutOwnerMock.address;
  });

  xit("should emit a Listed event correctly when listing an ERC1155", async () => {
    const ERC1155Mock = await ethers.getContractFactory("ERC1155Mock");
    erc1155Mock = await ERC1155Mock.deploy();
    await erc1155Mock.deployed();
    let tokenId = 1;
    let amount = 10;
    await erc1155Mock.mint(lister.address, tokenId, amount);
  });
  xit("should emit a Listed event correctly when listing an ERC1155 With ERC2981", async () => {
    let ERC1155WithERC2981Mock = await ethers.getContractFactory(
      "ERC1155WithERC2981Mock"
    );
    erc1155With2981Mock = await ERC1155WithERC2981Mock.deploy();
    await erc1155With2981Mock.deployed();
    let tokenId = 1;
    let amount = 10;
    await erc1155With2981Mock.mint(lister.address, tokenId, amount);
  });
  xit("should emit a Listed event correctly when listing an ERC1155 without owner", async () => {
    const ERC1155WithoutOwnerMock = await ethers.getContractFactory(
      "ERC1155WithoutOwnerMock"
    );
    erc1155WithoutOwnerMock = await ERC1155WithoutOwnerMock.deploy();
    await erc1155WithoutOwnerMock.deployed();
    let tokenId = 1;
    let amount = 10;
    await erc1155WithoutOwnerMock.mint(lister.address, tokenId, amount);
  });

  xit("should emit a Bought event for ERC721", async () => {});
  xit("should emit a Bought event for ERC1155", async () => {});
  xit("should emit a Bought event for partial ERC1155", async () => {});
  xit("should emit a Bought event for remainder of partial and Unlist event when fully depleted ERC1155", async () => {});
  xit("should emit a Bought event for ERC721 with ERC2891", async () => {});
  xit("should emit a Bought event for ERC1155 with ERC2891", async () => {});

  xit("should emit a Unlisted event when unlisting", async () => {});
  xit("should emit a Unlisted event when buying", async () => {});

  xit("should emit UnlistStale when stale token is unlisted", async () => {});

  xit("should emit Reserved when token is reserved", async () => {});

  xit("should emit a RoyaltiesSet event when listing", async () => {});
  xit("should emit a RoyaltiesSet event when updating royalties", async () => {});

  xit("should emit a PaymentTokenAdded event", async () => {});
  xit("should emit a FundsWithdrawn event for withdrawal", async () => {});

  xit("should emit a ProtocolWalletChanged event when changing protocol wallet", async () => {});
  xit("should emit a ProtocolFeeChanged event when changing protocol wallet", async () => {});

  xit("should emit event when paused", async () => {});
  xit("should emit event when unpaused", async () => {});
});
