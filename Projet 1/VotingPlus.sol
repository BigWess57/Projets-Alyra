// SPDX-License-Identifier: MIT

pragma solidity >=0.8.30;

import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/access/Ownable.sol";

contract VotingPlus is Ownable {

//////Structs//////

    //designe un electeurs
    struct Voter {
        bool isRegistered;
        bool hasVoted;
        uint votedProposalId;
    }

    //designe une proposition
    struct Proposal { 
        string description; 
        uint voteCount; 
    }

    // enumeration qui gere l'etat du vote
    enum WorkflowStatus {
        RegisteringVoters, 
        ProposalsRegistrationStarted, 
        ProposalsRegistrationEnded, 
        VotingSessionStarted, 
        VotingSessionEnded, 
        VotesTallied 
    }

//////Events//////

    event VoterRegistered(address voterAddress);
    event WorkflowStatusChange(WorkflowStatus previousStatus, WorkflowStatus newStatus);
    event ProposalRegistered(uint proposalId);
    event Voted (address voter, uint proposalId);


//////Variables globales//////

    //whitelist des electeurs
    mapping (address => Voter) votersWhitelist;
    //etat actuel du vote (etat initial : enregistrement des electeurs)
    WorkflowStatus currentState = WorkflowStatus.RegisteringVoters;
    //On veut qu'il y ait un temps minimal entre chaque changement d'etat (pour eviter des manipulation potentielles de l'administrateur).
    //Cette variable garde en memoire le timestamp en secondes a partir duquel l'admin pourra a nouveau changer l'etat du vote
    uint nextStateChangeAuthorizedTimestamp;
    //Liste des propositions
    Proposal[] proposals;

//Constructeur
    constructor() Ownable(msg.sender){
    }

//////Modifiers//////

    //Modifier servant a checker l'etat actuel du vote, empechant les acteurs d'agir au mauvais moment (y compris l'administrateur)
    modifier authorizeAction(WorkflowStatus _expectedState){
        require(_expectedState == currentState, "Not the time for this!");
        _;
    }
    //Verifie que l'utilisateur est bien enregistre dans la votersWhitelist
    modifier isRegistered(){
        require(votersWhitelist[msg.sender].isRegistered, "The voter is not registered in the votersWhitelist");
        _;
    }
    //Verifie que l'administrateur a respecte le delai pour changer l'etat
    modifier delayRespected(){
        require(block.timestamp > nextStateChangeAuthorizedTimestamp, "The delay for the state change is not respected");
        _;
    }

///////Fonctions///////

    //L'administrateur peut ajouter un electeur a la votersWhitelist
    function registerVoter(address _voterAddress) external onlyOwner authorizeAction(WorkflowStatus.RegisteringVoters){
        require(!votersWhitelist[_voterAddress].isRegistered, "The voter is already on the votersWhitelist");
        votersWhitelist[_voterAddress].isRegistered = true;
        emit VoterRegistered(_voterAddress);
    }

    //Fonction permettant le changement d'etat
    function changeVotingState() external onlyOwner delayRespected{
        require(currentState != WorkflowStatus.VotesTallied, "Votes are already tallied, the voting process is over");

        nextStateChangeAuthorizedTimestamp = block.timestamp + 1 hours; //donne 1 heure de temps minimum entre les etapes
        //Enregistrer l'etat courant
        WorkflowStatus previousState = currentState;
        //Set l'etat courant au suivant
        uint nextState = uint(currentState) + 1; 
        currentState = WorkflowStatus(nextState);
        //event
        emit WorkflowStatusChange(previousState, currentState);
    }

    //Fonction d'enregistrement des propositions
    function registerProposal(string calldata _description) external authorizeAction(WorkflowStatus.ProposalsRegistrationStarted) isRegistered {
        Proposal memory newProposal = Proposal(_description, 0);
        proposals.push(newProposal);
        emit ProposalRegistered(uint(proposals.length -1)); 
        //L'ID de la proposition est enregistre en tant qu'event dans la transaction, c est sa place dans le tableau proposals[].
        //Servira aux electeurs pour savoir pour qui voter
    }

    //Fonction de vote
    function Vote(uint _proposalId) external authorizeAction(WorkflowStatus.VotingSessionStarted) isRegistered {
        require(!votersWhitelist[msg.sender].hasVoted, "The voter has already voted");
        require(_proposalId < proposals.length && _proposalId >= 0 , "Invalid proposal id");
        proposals[_proposalId].voteCount++;
        votersWhitelist[msg.sender].hasVoted = true;
        emit Voted (msg.sender, _proposalId);
    }

    //Obtenir l'ID ou les ID de la/des proposition gagnante (On return un tableau pour les cas d'egalite)
    function getWinner() external view authorizeAction(WorkflowStatus.VotesTallied) returns(Proposal[] memory){

        //Pas besoin d'iterer sur la premiere, on l'enregistre direct ici
        uint maxVoteCount = proposals[0].voteCount;
        uint topCount = 1;

        // D'abord trouvez le nombre maximal de votes et combien de propositions ont ce nombre de vote
        for (uint i = 1; i < proposals.length; i++) {
            if (proposals[i].voteCount > maxVoteCount) {
                maxVoteCount = proposals[i].voteCount;
                topCount = 1;
            } else if (proposals[i].voteCount == maxVoteCount) {
                topCount++;
            }
        }

        // Ensuite rassembler et retourner toutes les propositions ayant obtenu le nombre maximal de votes
        Proposal[] memory topProposals = new Proposal[](topCount);
        uint j = 0;
        for (uint i = 0; i < proposals.length; i++) {
            if (proposals[i].voteCount == maxVoteCount) {
                topProposals[j] = proposals[i];
                j++;
            }
        }

        return topProposals;
    }

}