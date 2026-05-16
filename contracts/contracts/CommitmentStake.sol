// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract CommitmentStake {

    enum Status { ACTIVE, COMPLETED, FAILED }

    struct Commitment {
        address creator;
        string title;
        string evidenceIPFSHash;
        uint256 stakeAmount;
        uint256 deadline;
        address charityAddress;
        address[] verifiers;
        uint256 passVotes;
        uint256 failVotes;
        Status status;
    }

    mapping(uint256 => Commitment) public commitments;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    uint256 public commitmentCount;

    event CommitmentCreated(uint256 id, address creator, uint256 stake, uint256 deadline);
    event VoteCast(uint256 id, address verifier, bool passed);
    event CommitmentResolved(uint256 id, Status outcome, uint256 amount);

    function createCommitment(
        string calldata _title,
        uint256 _deadline,
        address _charityAddress,
        address[] calldata _verifiers
    ) external payable {
        require(msg.value > 0, "Must stake ETH");
        require(_deadline > block.timestamp, "Deadline must be future");
        require(_verifiers.length >= 1, "Need at least 1 verifier");
        require(_charityAddress != address(0), "Invalid charity address");

        uint256 id = commitmentCount++;
        Commitment storage c = commitments[id];
        c.creator = msg.sender;
        c.title = _title;
        c.stakeAmount = msg.value;
        c.deadline = _deadline;
        c.charityAddress = _charityAddress;
        c.verifiers = _verifiers;
        c.status = Status.ACTIVE;

        emit CommitmentCreated(id, msg.sender, msg.value, _deadline);
    }

    function castVote(uint256 _id, bool _passed) external {
        Commitment storage c = commitments[_id];
        require(c.status == Status.ACTIVE, "Not active");
        require(block.timestamp <= c.deadline, "Deadline passed");
        require(!hasVoted[_id][msg.sender], "Already voted");

        bool isVerifier = false;
        for (uint i = 0; i < c.verifiers.length; i++) {
            if (c.verifiers[i] == msg.sender) {
                isVerifier = true;
                break;
            }
        }
        require(isVerifier, "Not a verifier");

        hasVoted[_id][msg.sender] = true;
        if (_passed) c.passVotes++;
        else c.failVotes++;

        emit VoteCast(_id, msg.sender, _passed);
        _tryResolve(_id);
    }

    function uploadEvidence(uint256 _id, string calldata _ipfsHash) external {
        Commitment storage c = commitments[_id];
        require(c.creator == msg.sender, "Not creator");
        require(c.status == Status.ACTIVE, "Not active");
        c.evidenceIPFSHash = _ipfsHash;
    }

    function resolveAfterDeadline(uint256 _id) external {
        Commitment storage c = commitments[_id];
        require(c.status == Status.ACTIVE, "Not active");
        require(block.timestamp > c.deadline, "Deadline not passed");
        _resolveCommitment(_id);
    }

    function _tryResolve(uint256 _id) internal {
        Commitment storage c = commitments[_id];
        uint256 total = c.verifiers.length;
        uint256 majority = total / 2 + 1;

        if (c.passVotes >= majority) {
            c.status = Status.COMPLETED;
            payable(c.creator).transfer(c.stakeAmount);
            emit CommitmentResolved(_id, Status.COMPLETED, c.stakeAmount);
        } else if (c.failVotes >= majority) {
            c.status = Status.FAILED;
            payable(c.charityAddress).transfer(c.stakeAmount);
            emit CommitmentResolved(_id, Status.FAILED, c.stakeAmount);
        }
    }

    function _resolveCommitment(uint256 _id) internal {
        Commitment storage c = commitments[_id];
        if (c.passVotes > c.failVotes) {
            c.status = Status.COMPLETED;
            payable(c.creator).transfer(c.stakeAmount);
            emit CommitmentResolved(_id, Status.COMPLETED, c.stakeAmount);
        } else {
            c.status = Status.FAILED;
            payable(c.charityAddress).transfer(c.stakeAmount);
            emit CommitmentResolved(_id, Status.FAILED, c.stakeAmount);
        }
    }

    function getVerifiers(uint256 _id) external view returns (address[] memory) {
        return commitments[_id].verifiers;
    }
}
