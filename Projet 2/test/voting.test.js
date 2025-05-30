const {loadFixture} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { assert, expect } = require("chai")
const { ethers } = require("hardhat")

// const { keccak256, AbiCoder } = ethers;
// const { BN } = require("ethereumjs-util");

describe("Voting Tests", function () {


/**************  Declaration des base states ****************/

    //Just deployment
    async function deployVotingFixtureBase() { 
        const signers = await ethers.getSigners();
        const Voting = await ethers.getContractFactory('Voting'); 
        const voting = await Voting.deploy();
        return { voting, signers };
    }

    //Deployment with admin as voter
    async function deployVotingFixtureOwnerVoter() { 
        const signers = await ethers.getSigners();
        const Voting = await ethers.getContractFactory('Voting'); 
        const voting = await Voting.deploy();
        //Add owner as a voter
        await voting.addVoter(signers[0].address);
        return { voting, signers };
    }

    //Start in proposal state
    async function deployVotingFixtureProposals() { 
        //Use the previous function (to not write duplicate code)
        const {voting, signers} = await deployVotingFixtureOwnerVoter();
        //Add 2 more voters
        await voting.addVoter(signers[1].address);
        await voting.addVoter(signers[2].address);
        //Start proposal registering
        await voting.startProposalsRegistering();
        return { voting, signers };
    }

    //Start in voting state
    async function deployVotingFixtureVoting() { 
        //Use the previous function (to not write duplicate code)
        const {voting, signers} = await deployVotingFixtureProposals();
        //Add 3 propositions
        await voting.addProposal("proposal 1");
        await voting.addProposal("proposal 2");
        await voting.addProposal("proposal 3");
        //Start voting
        await voting.endProposalsRegistering();
        await voting.startVotingSession();

        return { voting, signers };
    }

    //Start in votingEnded state
    async function deployVotingFixtureVotingEnded() { 
        //Use the previous function (to not write duplicate code)
        const {voting, signers} = await deployVotingFixtureVoting();
        //everyone votes
        await voting.setVote(1);
        await voting.connect(signers[1]).setVote(2);
        await voting.connect(signers[2]).setVote(2);
        //End voting session
        await voting.endVotingSession();
        return { voting, signers };
    }



    //declaration de la variable d'etat
    const WorkflowStatus = {
      RegisteringVoters: 0,
      ProposalsRegistrationStarted: 1,
      ProposalsRegistrationEnded: 2,
      VotingSessionStarted: 3,
      VotingSessionEnded: 4,
      VotesTallied: 5,
    };



/**************  TESTS ****************/

    //Initial state
    describe('Initial state', function() { 
        let voting;
        let signers;
        beforeEach(async function () {
            ({voting, signers} = await loadFixture(deployVotingFixtureBase));
        });

        it('should juste deploy the contract', async function() { 
        })
        it('should check Initial state', async function() { 
            expect(await voting.workflowStatus()).to.equal(WorkflowStatus.RegisteringVoters);
        })
        it('should check owner', async function() { 
            expect(await voting.owner()).to.equal(signers[0].address);
        })
        it('should check that winning proposal is 0', async function() { 
            expect(await voting.winningProposalID()).to.equal(0);
        })
    });

    //Registering voters
    describe('Registering voters', function() { 
        let voting;
        let signers;
        beforeEach(async function () {
            ({voting, signers} = await loadFixture(deployVotingFixtureOwnerVoter));
        });

        it('should register a voter', async function() { 
            await voting.addVoter(signers[1].address);
            let voter = await voting.getVoter(signers[1].address);

            expect(voter.isRegistered).to.equal(true);
        })  

        it("should check that only the admin can register a voter", async function() {
            await expect(voting.connect(signers[1]).addVoter(signers[1].address)).to.be.revertedWithCustomError(voting, "OwnableUnauthorizedAccount").withArgs(signers[1].address);
        })

        it("should check that the admin cannot add a voter twice", async function() {
            await voting.addVoter(signers[1].address)
            await expect(voting.addVoter(signers[1].address)).to.be.revertedWith('Already registered');
        })

        it("should emit event on Voter registered", async function() {
            await expect(voting.addVoter(signers[1].address))
                  .to.emit(voting, "VoterRegistered")
                  .withArgs(signers[1].address); 
        })

    })

    //Registering propositions
    describe('Registering propositions', function() { 
        let voting;
        let signers;
        beforeEach(async function () {
            ({voting, signers} = await loadFixture(deployVotingFixtureProposals));
        });

        it("should have a genesis proposal by default", async function() {
            let genesisProposal = await voting.getOneProposal(0);
            expect(genesisProposal.description).to.be.equal('GENESIS');
        })

        it("should store a proposal", async function() {
            await voting.addProposal("proposal test")
            let storedProposal = await voting.getOneProposal(1)
            expect(storedProposal.description).to.be.equal('proposal test');
        })

        it("should revert if not a voter storing a proposal", async function() {
            await expect(voting.connect(signers[3]).addProposal("proposal test")).to.be.revertedWith("You're not a voter");
        })

        it("should revert if empty proposal", async function() {
            await expect(voting.addProposal("")).to.be.revertedWith('Vous ne pouvez pas ne rien proposer');
        })

        it("should emit event on Proposal added", async function() {
            await expect(voting.addProposal("proposal test"))
                  .to.emit(voting, "ProposalRegistered")
                  .withArgs(1); 
        })

    })

    //Voting
    describe('Voting', function() { 
        let voting;
        let signers;
        beforeEach(async function () {
            ({voting, signers} = await loadFixture(deployVotingFixtureVoting));
        });

        it("should store the vote", async function() {
            await voting.setVote(1);
            const proposal1 = await voting.getOneProposal(1)
            expect(proposal1.voteCount).to.be.equal(1);
        })

        it("should revert because only voters are allowed to vote", async function() {
            await expect(voting.connect(signers[3]).setVote(1)).to.be.revertedWith("You're not a voter");
        })

        it("should NOT allow to vote twice", async function() {
            await voting.setVote(1);
            await expect(voting.setVote(1)).to.be.revertedWith('You have already voted');
        })

        it("should emit event on Vote", async function() {
            await expect(voting.setVote(1))
                  .to.emit(voting, "Voted")
                  .withArgs(signers[0].address, 1); 
        })

    })

    //Voting Ended
    describe('Voting Ended', function() { 
        let voting;
        let signers;
        beforeEach(async function () {
            ({voting, signers} = await loadFixture(deployVotingFixtureVotingEnded));
        });

        it("should only allow the owner to tally votes", async function() {
            await expect(voting.connect(signers[1]).tallyVotes()).to.be.revertedWithCustomError(voting, "OwnableUnauthorizedAccount").withArgs(signers[1].address);
        })

        it("should store the winning proposal", async function() {
            await voting.tallyVotes();
            //Should be the "proposal 2" (not counting genesis)
            expect(await voting.winningProposalID()).to.be.equal(2)
        })

        it("should set the state to 'VotesTallied'", async function() {
            await voting.tallyVotes();
            expect(await voting.workflowStatus()).to.be.equal(WorkflowStatus.VotesTallied)
        })
    });


    //Describe to check if state is correct for each action
    describe('Authorize actions', function() { 
        let voting;
        let signers;
        //Start from a fresh initial state, with a voter
        beforeEach(async function () {
            ({voting, signers} = await loadFixture(deployVotingFixtureOwnerVoter));
        });

        //Admin only
        it("should only be admin who changes states", async function() {
            //Check for all states (except tallyVotes, checked earlier)
            await expect(voting.connect(signers[1]).startProposalsRegistering()).to.be.revertedWithCustomError(voting, "OwnableUnauthorizedAccount").withArgs(signers[1].address);

            await voting.startProposalsRegistering()
            await expect(voting.connect(signers[1]).endProposalsRegistering()).to.be.revertedWithCustomError(voting, "OwnableUnauthorizedAccount").withArgs(signers[1].address);

            await voting.endProposalsRegistering()
            await expect(voting.connect(signers[1]).startVotingSession()).to.be.revertedWithCustomError(voting, "OwnableUnauthorizedAccount").withArgs(signers[1].address);

            await voting.startVotingSession()
            await expect(voting.connect(signers[1]).endVotingSession()).to.be.revertedWithCustomError(voting, "OwnableUnauthorizedAccount").withArgs(signers[1].address);            
        })

        //Adding voters
        it("should only be possible for the admin to add a voter during RegisteringVoters state", async function() {
            //Check for all states
            await voting.startProposalsRegistering()
            await expect(voting.addVoter(signers[1].address)).to.be.revertedWith('Voters registration is not open yet');

            await voting.endProposalsRegistering()
            await expect(voting.addVoter(signers[1].address)).to.be.revertedWith('Voters registration is not open yet');

            await voting.startVotingSession()
            await expect(voting.addVoter(signers[1].address)).to.be.revertedWith('Voters registration is not open yet');

            await voting.endVotingSession()
            await expect(voting.addVoter(signers[1].address)).to.be.revertedWith('Voters registration is not open yet');

            await voting.tallyVotes()
            await expect(voting.addVoter(signers[1].address)).to.be.revertedWith('Voters registration is not open yet');
        })

        //Adding propositions
        it("should only be possible to add proposal during startProposalRegistration state", async function() {
            //Check for all states
            await expect(voting.addProposal("proposal test")).to.be.revertedWith('Proposals are not allowed yet');

            //Dont check this state, we already know it works here
            await voting.startProposalsRegistering()

            await voting.endProposalsRegistering()
            await expect(voting.addProposal("proposal test")).to.be.revertedWith('Proposals are not allowed yet');

            await voting.startVotingSession()
            await expect(voting.addProposal("proposal test")).to.be.revertedWith('Proposals are not allowed yet');

            await voting.endVotingSession()
            await expect(voting.addProposal("proposal test")).to.be.revertedWith('Proposals are not allowed yet');

            await voting.tallyVotes()
            await expect(voting.addProposal("proposal test")).to.be.revertedWith('Proposals are not allowed yet');
        });
        
        //Voting
        it("should only be possible to vote during VotingSessionStarted state", async function() {
            //Check for all states
            await voting.startProposalsRegistering()
            await expect(voting.setVote(1)).to.be.revertedWith('Voting session havent started yet');
            
            await voting.endProposalsRegistering()
            await expect(voting.setVote(1)).to.be.revertedWith('Voting session havent started yet');

            //Dont check this state, we already know it works here
            await voting.startVotingSession()

            await voting.endVotingSession()
            await expect(voting.setVote(1)).to.be.revertedWith('Voting session havent started yet');

            await voting.tallyVotes()
            await expect(voting.setVote(1)).to.be.revertedWith('Voting session havent started yet');
        });

        //Voting Ended
        it("should only be possible to tally votes during VotingSessionEnded state", async function() {
            //Check for all states
            await voting.startProposalsRegistering()
            await expect(voting.tallyVotes()).to.be.revertedWith("Current status is not voting session ended");
            
            await voting.endProposalsRegistering()
            await expect(voting.tallyVotes()).to.be.revertedWith("Current status is not voting session ended");

            await voting.startVotingSession()
            await expect(voting.tallyVotes()).to.be.revertedWith("Current status is not voting session ended");

            //Dont check this state, we already know it works here
            await voting.endVotingSession()
            
            await voting.tallyVotes()
            await expect(voting.tallyVotes()).to.be.revertedWith("Current status is not voting session ended");
        });

        //Events
        it("should emit event on status change", async function() {
            //Check for all states
            await expect(voting.startProposalsRegistering())
                  .to.emit(voting, "WorkflowStatusChange")
                  .withArgs(WorkflowStatus.RegisteringVoters, WorkflowStatus.ProposalsRegistrationStarted); 

            await expect(voting.endProposalsRegistering())
                  .to.emit(voting, "WorkflowStatusChange")
                  .withArgs(WorkflowStatus.ProposalsRegistrationStarted, WorkflowStatus.ProposalsRegistrationEnded); 

            await expect(voting.startVotingSession())
                  .to.emit(voting, "WorkflowStatusChange")
                  .withArgs(WorkflowStatus.ProposalsRegistrationEnded, WorkflowStatus.VotingSessionStarted); 

            await expect(voting.endVotingSession())
                  .to.emit(voting, "WorkflowStatusChange")
                  .withArgs(WorkflowStatus.VotingSessionStarted, WorkflowStatus.VotingSessionEnded); 

            await expect(voting.tallyVotes())
                  .to.emit(voting, "WorkflowStatusChange")
                  .withArgs(WorkflowStatus.VotingSessionEnded, WorkflowStatus.VotesTallied);
        })

    });

});