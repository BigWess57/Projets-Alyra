Ajouts dans VotingPlus.sol :
  - Gérer le cas ou plusieurs propositions ont le meme nombre de vote. dans ce cas, on return toutes les propositions gagnantes.
  - Ajout d'un timer qui empeche l'admin de passer trop vite les phases de propostion et de vote.
Cela l'empeche par exemple de, a l'aide de complices, ouvrir le vote, puis voter d'un coup a plusieurs et fermer directement le vote au bloc d'apres.
Ici j'ai mis 1 jour pour le vote et 1 jour pour les propositions. Je n'en ai pas mis pour les autres phases
  - 
