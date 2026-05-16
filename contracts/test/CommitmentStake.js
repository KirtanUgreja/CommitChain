const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CommitmentStake", function () {
  let contract;
  let owner, verifier1, verifier2, charity;

  beforeEach(async function () {
    [owner, verifier1, verifier2, charity] = await ethers.getSigners();

    const CommitmentStake = await ethers.getContractFactory("CommitmentStake");
    contract = await CommitmentStake.deploy();
    await contract.waitForDeployment();
  });

  it("Should create a commitment with correct stake", async function () {
    const deadline = Math.floor(Date.now() / 1000) + 86400; // 24hrs from now

    await contract.createCommitment(
      "Exercise 5 days",
      deadline,
      charity.address,
      [verifier1.address],
      { value: ethers.parseEther("0.01") }
    );

    const c = await contract.commitments(0);
    expect(c.creator).to.equal(owner.address);
    expect(c.title).to.equal("Exercise 5 days");
    expect(c.stakeAmount).to.equal(ethers.parseEther("0.01"));
    expect(c.status).to.equal(0); // ACTIVE
  });

  it("Should reject zero stake", async function () {
    const deadline = Math.floor(Date.now() / 1000) + 86400;

    await expect(
      contract.createCommitment(
        "Test",
        deadline,
        charity.address,
        [verifier1.address],
        {
          value: 0,
        }
      )
    ).to.be.revertedWith("Must stake ETH");
  });

  it("Should reject past deadline", async function () {
    const pastDeadline = Math.floor(Date.now() / 1000) - 100;

    await expect(
      contract.createCommitment(
        "Test",
        pastDeadline,
        charity.address,
        [verifier1.address],
        {
          value: ethers.parseEther("0.01"),
        }
      )
    ).to.be.revertedWith("Deadline must be future");
  });

  it("Should allow verifier to vote", async function () {
    const deadline = Math.floor(Date.now() / 1000) + 86400;
    await contract.createCommitment(
      "Test",
      deadline,
      charity.address,
      [verifier1.address],
      {
        value: ethers.parseEther("0.01"),
      }
    );

    await contract.connect(verifier1).castVote(0, true);
    const c = await contract.commitments(0);
    expect(c.passVotes).to.equal(1);
  });

  it("Should prevent double voting", async function () {
    const deadline = Math.floor(Date.now() / 1000) + 86400;
    await contract.createCommitment(
      "Test",
      deadline,
      charity.address,
      [verifier1.address, verifier2.address],
      {
        value: ethers.parseEther("0.01"),
      }
    );

    await contract.connect(verifier1).castVote(0, true);
    await expect(
      contract.connect(verifier1).castVote(0, true)
    ).to.be.revertedWith("Already voted");
  });

  it("Should prevent non-verifier from voting", async function () {
    const deadline = Math.floor(Date.now() / 1000) + 86400;
    await contract.createCommitment(
      "Test",
      deadline,
      charity.address,
      [verifier1.address],
      {
        value: ethers.parseEther("0.01"),
      }
    );

    await expect(
      contract.connect(verifier2).castVote(0, true)
    ).to.be.revertedWith("Not a verifier");
  });

  it("Should release ETH to creator on pass majority", async function () {
    const deadline = Math.floor(Date.now() / 1000) + 86400;
    await contract.createCommitment(
      "Test",
      deadline,
      charity.address,
      [verifier1.address],
      {
        value: ethers.parseEther("0.01"),
      }
    );

    const balanceBefore = await ethers.provider.getBalance(owner.address);
    await contract.connect(verifier1).castVote(0, true);
    const balanceAfter = await ethers.provider.getBalance(owner.address);

    expect(balanceAfter).to.be.gt(balanceBefore);
  });

  it("Should send ETH to charity on fail majority", async function () {
    const deadline = Math.floor(Date.now() / 1000) + 86400;
    await contract.createCommitment(
      "Test",
      deadline,
      charity.address,
      [verifier1.address],
      {
        value: ethers.parseEther("0.01"),
      }
    );

    const charityBefore = await ethers.provider.getBalance(charity.address);
    await contract.connect(verifier1).castVote(0, false);
    const charityAfter = await ethers.provider.getBalance(charity.address);

    expect(charityAfter).to.be.gt(charityBefore);
  });
});
