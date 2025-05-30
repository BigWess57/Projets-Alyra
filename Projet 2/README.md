
Autre approche : PAR FONCTIONNALITE
 - Initial state:
        => Premier test qui fait rien, deploie juste le contrat pour voir si tout va bien
        => Check que on est bien en mode RegisteringVoters au deploiement
        => Check que l'owner est bien le deployeur du contrat
        => Check que la proposition gagnante est 0

 - Enregistrement des voters (admin)
	=> Check qu'on peut enregistrer un voter
	=> Check que seul l'admin peut le faire
	=> Check que l'admin ne peut pas ajouter 2 fois un voter
	
 - Proposition des propositions
	=> Check qu'on peut enregistrer une proposition
	=> Check qu'une proposition est enregistré de base (Genesis) pour eviter les problemes d'index 0
	=> Check que seul un voter peut enregistrer une proposition
	=> Check qu'on peut pas enregistrer de propositions vides

 - Vote
	=> Check qu'on peut voter (verifier que le votecount de la proposal s'incremente bien)
        => Check que seuls les voters peuvent voter
        => Check qu'on peut voter qu'une fois

 - Comptage des votes
	=> Check que seul l'admin peut le faire
	=> Check que la proposition gagnante est celle qu'on attend (si le tableau de propositions n'est pas vide, hormis la genesis)
	=> Check que l'état devient VotingTallied

 - Changement d'état (admin)
        => Check que seul l'admin peut changer d'étape
	=> Check qu'on peut enregister les voters que pendant le RegisteringVoters
	=> Check qu'on peut enregistrer les propositions que pendant ProposalRegistrationStarted
	=> Check qu'on peut voter que pendant VotingStarted
	=> Check qu'on peut compter les votes que pendant VotingEnded

 - Events
	=> Check event VoterRegistered
	=> Check event ProposalRegistered
	=> Check event Voted
	=> Check event WorkflowStatusChange pour chaque changement de status

	