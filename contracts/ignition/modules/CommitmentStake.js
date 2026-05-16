const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("CommitmentStakeModule", (m) => {
  const commitmentStake = m.contract("CommitmentStake");
  return { commitmentStake };
});
