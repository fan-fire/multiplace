const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
  constants, // Common constants, like the zero address and largest integers
} = require("@openzeppelin/test-helpers");

const {
  NFT_TYPE,
  listingToObject,
  PROTOCOL_FEE_DEN,
  PROTOCOL_FEE_NUM,
} = require("./utils");

Array.prototype.forEachAsync = async function (fn) {
  for (let t of this) {
    await fn(t);
  }
};

describe("Events", async () => {
  let owner;
  let lister;
  let buyer;

  let multiplace;
  let multiplaceProxy;
  let erc20Mock;

  beforeEach(async () => {
    [owner, lister, buyer] = await ethers.getSigners();

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

    await erc20Mock
      .connect(owner)
      .transfer(buyer.address, ethers.utils.parseEther("10"));
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

  it("should emit a Listed event correctly when listing an ERC721 With ERC2981", async () => {
    let ERC721WithERC2981Mock = await ethers.getContractFactory(
      "ERC721WithERC2981Mock"
    );
    erc721With2981Mock = await ERC721WithERC2981Mock.deploy();
    await erc721With2981Mock.deployed();
    await erc721With2981Mock.mint(lister.address);

    let tokenId = 0;
    let tokenAddr = erc721With2981Mock.address;

    await erc721With2981Mock
      .connect(lister)
      .setApprovalForAll(multiplace.address, true);

    let listPtr = 0;
    let seller = lister.address;
    let unitPrice = 10;
    let amount = 1;
    let paymentToken = erc20Mock.address;
    let nftType = NFT_TYPE.ERC721_2981;

    let royaltyFrom721 = await erc721With2981Mock.royaltyInfo(
      tokenId,
      unitPrice
    );
    let unitRoyaltyAmountFrom721 = royaltyFrom721.royaltyAmount;
    let receiverFrom721 = royaltyFrom721.receiver;

    let royaltyReceiver = receiverFrom721;
    let unitRoyaltyAmount = unitRoyaltyAmountFrom721;

    let tx = await multiplace
      .connect(lister)
      .list(tokenAddr, tokenId, amount, unitPrice, paymentToken);

    const receipt = await tx.wait();
    let events = receipt.events.map((e) => multiplace.interface.parseLog(e));

    let eventName = "Listed";

    let event = events.find((e) => e.name === eventName);

    let expectedEventArgs = {
      listPtr: listPtr.toString(),
      tokenAddr: tokenAddr,
      tokenId: tokenId.toString(),
      seller: seller,
      unitPrice: unitPrice.toString(),
      amount: amount.toString(),
      paymentToken: paymentToken,
      nftType: nftType,
      royaltyReceiver: royaltyReceiver,
      unitRoyaltyAmount: unitRoyaltyAmount.toString(),
    };

    let actualEventArgs = {
      listPtr: event.args.listPtr.toString(),
      tokenAddr: event.args.tokenAddr,
      tokenId: event.args.tokenId.toString(),
      seller: event.args.seller,
      unitPrice: event.args.unitPrice.toString(),
      amount: event.args.amount.toString(),
      paymentToken: event.args.paymentToken,
      nftType: event.args.nftType,
      royaltyReceiver: event.args.royaltyReceiver,
      unitRoyaltyAmount: event.args.unitRoyaltyAmount.toString(),
    };

    expect(actualEventArgs).to.deep.equal(expectedEventArgs);
  });
  it("should emit a Listed event correctly when listing an ERC721 without owner", async () => {
    let ERC721WithoutOwnerMock = await ethers.getContractFactory(
      "ERC721WithoutOwnerMock"
    );
    erc721WithoutOwnerMock = await ERC721WithoutOwnerMock.deploy();
    await erc721WithoutOwnerMock.deployed();
    await erc721WithoutOwnerMock.mint(lister.address);
    let tokenId = 0;
    let tokenAddr = erc721WithoutOwnerMock.address;

    await erc721WithoutOwnerMock
      .connect(lister)
      .setApprovalForAll(multiplace.address, true);

    let listPtr = 0;
    let seller = lister.address;
    let unitPrice = 10;
    let amount = 1;
    let paymentToken = erc20Mock.address;
    let nftType = NFT_TYPE.ERC721;
    let royaltyReceiver = constants.ZERO_ADDRESS;
    let unitRoyaltyAmount = 0;

    let tx = await multiplace
      .connect(lister)
      .list(tokenAddr, tokenId, amount, unitPrice, paymentToken);

    const receipt = await tx.wait();
    let events = receipt.events.map((e) => multiplace.interface.parseLog(e));

    let eventName = "Listed";

    let event = events.find((e) => e.name === eventName);

    let expectedEventArgs = {
      listPtr: listPtr.toString(),
      tokenAddr: tokenAddr,
      tokenId: tokenId.toString(),
      seller: seller,
      unitPrice: unitPrice.toString(),
      amount: amount.toString(),
      paymentToken: paymentToken,
      nftType: nftType,
      royaltyReceiver: royaltyReceiver,
      unitRoyaltyAmount: unitRoyaltyAmount.toString(),
    };

    let actualEventArgs = {
      listPtr: event.args.listPtr.toString(),
      tokenAddr: event.args.tokenAddr,
      tokenId: event.args.tokenId.toString(),
      seller: event.args.seller,
      unitPrice: event.args.unitPrice.toString(),
      amount: event.args.amount.toString(),
      paymentToken: event.args.paymentToken,
      nftType: event.args.nftType,
      royaltyReceiver: event.args.royaltyReceiver,
      unitRoyaltyAmount: event.args.unitRoyaltyAmount.toString(),
    };

    expect(actualEventArgs).to.deep.equal(expectedEventArgs);
  });

  it("should emit a Listed event correctly when listing an ERC1155", async () => {
    const ERC1155Mock = await ethers.getContractFactory("ERC1155Mock");
    erc1155Mock = await ERC1155Mock.deploy();
    await erc1155Mock.deployed();
    let tokenId = 1;
    let amount = 10;
    let tokenAddr = erc1155Mock.address;
    await erc1155Mock.mint(lister.address, tokenId, amount);

    await erc1155Mock
      .connect(lister)
      .setApprovalForAll(multiplace.address, true);

    let listPtr = 0;
    let seller = lister.address;
    let unitPrice = 10;
    let paymentToken = erc20Mock.address;
    let nftType = NFT_TYPE.ERC1155;
    let royaltyReceiver = owner.address;
    let unitRoyaltyAmount = 0;

    let tx = await multiplace
      .connect(lister)
      .list(tokenAddr, tokenId, amount, unitPrice, paymentToken);

    const receipt = await tx.wait();
    let events = receipt.events.map((e) => multiplace.interface.parseLog(e));

    let eventName = "Listed";

    let event = events.find((e) => e.name === eventName);

    let expectedEventArgs = {
      listPtr: listPtr.toString(),
      tokenAddr: tokenAddr,
      tokenId: tokenId.toString(),
      seller: seller,
      unitPrice: unitPrice.toString(),
      amount: amount.toString(),
      paymentToken: paymentToken,
      nftType: nftType,
      royaltyReceiver: royaltyReceiver,
      unitRoyaltyAmount: unitRoyaltyAmount.toString(),
    };

    let actualEventArgs = {
      listPtr: event.args.listPtr.toString(),
      tokenAddr: event.args.tokenAddr,
      tokenId: event.args.tokenId.toString(),
      seller: event.args.seller,
      unitPrice: event.args.unitPrice.toString(),
      amount: event.args.amount.toString(),
      paymentToken: event.args.paymentToken,
      nftType: event.args.nftType,
      royaltyReceiver: event.args.royaltyReceiver,
      unitRoyaltyAmount: event.args.unitRoyaltyAmount.toString(),
    };

    expect(actualEventArgs).to.deep.equal(expectedEventArgs);
  });
  it("should emit a Listed event correctly when listing an ERC1155 With ERC2981", async () => {
    let ERC1155WithERC2981Mock = await ethers.getContractFactory(
      "ERC1155WithERC2981Mock"
    );
    erc1155With2981Mock = await ERC1155WithERC2981Mock.deploy();
    await erc1155With2981Mock.deployed();
    let tokenId = 1;
    let amount = 10;
    await erc1155With2981Mock.mint(lister.address, tokenId, amount);

    let tokenAddr = erc1155With2981Mock.address;

    await erc1155With2981Mock
      .connect(lister)
      .setApprovalForAll(multiplace.address, true);

    let listPtr = 0;
    let seller = lister.address;
    let unitPrice = 10;
    let paymentToken = erc20Mock.address;
    let nftType = NFT_TYPE.ERC1155_2981;
    let royaltyFrom1155 = await erc1155With2981Mock.royaltyInfo(
      tokenId,
      unitPrice
    );
    let unitRoyaltyAmountFrom1155 = royaltyFrom1155.royaltyAmount;
    let receiverFrom1155 = royaltyFrom1155.receiver;

    let royaltyReceiver = receiverFrom1155;
    let unitRoyaltyAmount = unitRoyaltyAmountFrom1155;

    let tx = await multiplace
      .connect(lister)
      .list(tokenAddr, tokenId, amount, unitPrice, paymentToken);

    const receipt = await tx.wait();
    let events = receipt.events.map((e) => multiplace.interface.parseLog(e));

    let eventName = "Listed";

    let event = events.find((e) => e.name === eventName);

    let expectedEventArgs = {
      listPtr: listPtr.toString(),
      tokenAddr: tokenAddr,
      tokenId: tokenId.toString(),
      seller: seller,
      unitPrice: unitPrice.toString(),
      amount: amount.toString(),
      paymentToken: paymentToken,
      nftType: nftType,
      royaltyReceiver: royaltyReceiver,
      unitRoyaltyAmount: unitRoyaltyAmount.toString(),
    };

    let actualEventArgs = {
      listPtr: event.args.listPtr.toString(),
      tokenAddr: event.args.tokenAddr,
      tokenId: event.args.tokenId.toString(),
      seller: event.args.seller,
      unitPrice: event.args.unitPrice.toString(),
      amount: event.args.amount.toString(),
      paymentToken: event.args.paymentToken,
      nftType: event.args.nftType,
      royaltyReceiver: event.args.royaltyReceiver,
      unitRoyaltyAmount: event.args.unitRoyaltyAmount.toString(),
    };

    expect(actualEventArgs).to.deep.equal(expectedEventArgs);
  });
  it("should emit a Listed event correctly when listing an ERC1155 without owner", async () => {
    const ERC1155WithoutOwnerMock = await ethers.getContractFactory(
      "ERC1155WithoutOwnerMock"
    );
    erc1155WithoutOwnerMock = await ERC1155WithoutOwnerMock.deploy();
    await erc1155WithoutOwnerMock.deployed();
    let tokenId = 1;
    let amount = 10;
    let tokenAddr = erc1155WithoutOwnerMock.address;
    await erc1155WithoutOwnerMock.mint(lister.address, tokenId, amount);

    await erc1155WithoutOwnerMock
      .connect(lister)
      .setApprovalForAll(multiplace.address, true);

    let listPtr = 0;
    let seller = lister.address;
    let unitPrice = 10;
    let paymentToken = erc20Mock.address;
    let nftType = NFT_TYPE.ERC1155;

    let royaltyReceiver = constants.ZERO_ADDRESS;
    let unitRoyaltyAmount = 0;

    let tx = await multiplace
      .connect(lister)
      .list(tokenAddr, tokenId, amount, unitPrice, paymentToken);

    const receipt = await tx.wait();
    let events = receipt.events.map((e) => multiplace.interface.parseLog(e));
    let eventName = "Listed";
    let event = events.find((e) => e.name === eventName);

    let expectedEventArgs = {
      listPtr: listPtr.toString(),
      tokenAddr: tokenAddr,
      tokenId: tokenId.toString(),
      seller: seller,
      unitPrice: unitPrice.toString(),
      amount: amount.toString(),
      paymentToken: paymentToken,
      nftType: nftType,
      royaltyReceiver: royaltyReceiver,
      unitRoyaltyAmount: unitRoyaltyAmount.toString(),
    };

    let actualEventArgs = {
      listPtr: event.args.listPtr.toString(),
      tokenAddr: event.args.tokenAddr,
      tokenId: event.args.tokenId.toString(),
      seller: event.args.seller,
      unitPrice: event.args.unitPrice.toString(),
      amount: event.args.amount.toString(),
      paymentToken: event.args.paymentToken,
      nftType: event.args.nftType,
      royaltyReceiver: event.args.royaltyReceiver,
      unitRoyaltyAmount: event.args.unitRoyaltyAmount.toString(),
    };

    expect(actualEventArgs).to.deep.equal(expectedEventArgs);
  });

  it.only("should emit a Bought event for ERC721", async () => {
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
    let totalPrice = ethers.BigNumber.from(amount).mul(unitPrice);
    let protocolFee = totalPrice.mul(PROTOCOL_FEE_NUM).div(PROTOCOL_FEE_DEN);
    let nftType = NFT_TYPE.ERC721;
    let royaltyReceiver = owner.address;
    let unitRoyaltyAmount = 0;

    await multiplace
      .connect(lister)
      .list(tokenAddr, tokenId, amount, unitPrice, paymentToken);

    await erc20Mock.connect(buyer).approve(multiplace.address, totalPrice);

    let tx = await multiplace
      .connect(buyer)
      .buy(seller, tokenAddr, tokenId, amount);
    let receipt = await tx.wait();

    let events = receipt.events.map((e) => {
      try {
        let r = multiplace.interface.parseLog(e);
        r["contract"] = "multiplace";
        return r;
      } catch (_) {
        try {
          let r = erc20Mock.interface.parseLog(e);
          r["contract"] = "erc20Mock";
          return r;
        } catch (_) {
          try {
            let r = erc721Mock.interface.parseLog(e);
            r["contract"] = "erc721Mock";
            return r;
          } catch (_) {
            try {
              let r = erc1155Mock.interface.parseLog(e);
              r["contract"] = "erc1155Mock";
              return r;
            } catch (_) {
              try {
                let r = erc721With2981Mock.interface.parseLog(e);
                r["contract"] = "erc721With2981Mock";
                return r;
              } catch (_) {
                try {
                  let r = erc1155With2981Mock.interface.parseLog(e);
                  r["contract"] = "erc1155With2981Mock";
                  return r;
                } catch (_) {
                  return {
                    name: null,
                  };
                }
              }
            }
          }
        }
      }
    });

    let eventName = "Bought";
    let event = events.find((e) => e.name === eventName);

    let exepectedEvent = {
      listPtr: listPtr.toString(),
      tokenAddr: tokenAddr,
      tokenId: tokenId.toString(),
      buyer: buyer.address,
      unitPrice: unitPrice.toString(),
      amount: amount.toString(),
      paymentToken: paymentToken,
      nftType: nftType,
      royaltyReceiver: royaltyReceiver,
      unitRoyaltyAmount: unitRoyaltyAmount.toString(),
    };

    let actualEvent = {
      listPtr: event.args.listPtr.toString(),
      tokenAddr: event.args.tokenAddr,
      tokenId: event.args.tokenId.toString(),
      buyer: event.args.buyer,
      unitPrice: event.args.unitPrice.toString(),
      amount: event.args.amount.toString(),
      paymentToken: event.args.paymentToken,
      nftType: event.args.nftType,
      royaltyReceiver: event.args.royaltyReceiver,
      unitRoyaltyAmount: event.args.unitRoyaltyAmount.toString(),
    };

    expect(actualEvent).to.deep.equal(exepectedEvent);
  });

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
