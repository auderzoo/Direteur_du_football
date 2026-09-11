# Directeur Sportif — Prototype v4

## Lancer le jeu
Ouvrez `index.html` dans un navigateur (double-clic ou glisser dans Chrome/Firefox), depuis un dossier **extrait** (pas depuis l'intérieur du .zip). Aucune installation, aucun serveur requis. La sauvegarde se fait dans le navigateur (localStorage).

## Nouveautés de cette v4

**Moteur de match approfondi**
- Calcul séparé de l'attaque et de la défense (au lieu d'un seul indice de force globale), avec avantage du terrain.
- Tactique du joueur : 4 formations et 3 mentalités (offensive / équilibrée / défensive) qui modifient réellement l'attaque et la défense de votre club.
- Buteurs générés à chaque match (pondérés par le niveau des attaquants/milieux), affichés dans la popup de résultat et le journal.
- Système de blessures : chance de blessure à chaque match, joueur indisponible pendant plusieurs semaines (affiché dans l'effectif), et exclu du calcul de force tant qu'il n'est pas rétabli.
- La forme/moral des joueurs influence légèrement la force de l'équipe.

**Personnalisation**
- Nouvel onglet **Club** : identité (renommer le club, choisir une couleur de maillot), tactique, objectif de saison, profil du directeur sportif.
- **Niveau de difficulté** choisi à la création (Facile / Normal / Difficile), qui influence la dureté des négociations adverses.
- **Objectifs de saison** fixés automatiquement selon le niveau du club (viser le podium, le top 6, le maintien, la montée...) ; les atteindre ou les manquer fait évoluer la réputation du directeur sportif d'une saison à l'autre.

**Équilibrage**
- Reclibrage des formules de valorisation des joueurs, des salaires, du sponsoring et des primes pour une économie de club plus stable sur plusieurs saisons.
- Seuils de négociation (prix et salaire) recalibrés et testés pour que les offres cohérentes soient acceptées de façon prévisible.

## Feuille de route : 50 pistes pour approfondir encore le jeu
Certaines sont déjà présentes ✅, les autres sont des idées documentées pour de prochaines sessions.

**Moteur de match**
1. ✅ Séparation attaque/défense par ligne
2. ✅ Tactiques (formation + mentalité)
3. ✅ Buteurs générés
4. ✅ Blessures avec indisponibilité
5. ✅ Effet de la forme/moral sur la performance
6. 🔜 Cartons (jaune/rouge) et suspensions
7. 🔜 Feuille de match complète (composition, remplacements en cours de match)
8. 🔜 Séries de forme (bonus/malus sur plusieurs matchs consécutifs)
9. 🔜 Fatigue liée au calendrier chargé (championnat + coupes)
10. 🔜 Styles de jeu adverses variés selon l'identité de chaque club (possession, contre-attaque...)

**Personnalisation du directeur sportif**
11. ✅ Nationalité et spécialisation avec effets de jeu
12. ✅ Niveau de difficulté
13. ✅ Renommage et couleur du club
14. 🔜 Visage/portrait du DS (choix d'avatar illustré)
15. 🔜 Arbre de compétences du DS qui évolue avec l'expérience
16. 🔜 Historique de carrière (clubs entraînés, trophées, saisons)
17. 🔜 Offres d'autres clubs pour recruter le DS selon sa réputation
18. 🔜 Renvoi possible si les objectifs sont gravement manqués plusieurs saisons de suite
19. 🔜 Logo de club personnalisable (choix parmi des formes/motifs)
20. 🔜 Surnom et hymne du club

**Recrutement et effectif**
21. 🔜 Prêts de joueurs (avec ou sans option d'achat)
22. 🔜 Clauses libératoires
23. 🔜 Clause de vente future (sell-on clause)
24. 🔜 Agents de joueurs avec leur propre négociation et commission
25. 🔜 Rapports de scouting détaillés avant de négocier (forces/faiblesses d'un joueur)
26. 🔜 Réseau de scouts à améliorer (débloque des joueurs plus loin dans le monde)
27. 🔜 Statistiques de performance individuelle sur la saison (buts, passes, notes de match)
28. 🔜 Joueurs qui refusent un transfert selon leur attachement au club
29. 🔜 Retraite des joueurs en fin de carrière
30. 🔜 Génération de nouveaux jeunes joueurs chaque saison (centre de formation)

**Compétitions**
31. ✅ Coupe nationale
32. ✅ Coupe continentale
33. 🔜 Phase de groupes avant la phase à élimination directe en coupe continentale
34. 🔜 Deuxième compétition continentale (une "C2" pour les recalés)
35. 🔜 Coupe de la Ligue / trophée des champions en plus de la coupe nationale
36. 🔜 Barrages de promotion/relégation (au lieu d'un couperet direct)
37. 🔜 Classement historique et records du club (meilleur buteur all-time, etc.)

**Finances et club**
38. ✅ Merchandising et primes de coupes dans le bilan mensuel
39. 🔜 Investissements dans les infrastructures (stade, centre d'entraînement) avec effets à long terme
40. 🔜 Emprunts bancaires et dettes
41. 🔜 Sponsors à négocier (contrats de durée et montant variables)
42. 🔜 Droits TV répartis selon le classement
43. 🔜 Capacité du stade et affluence variable selon les résultats
44. 🔜 Actionnaires/propriétaire avec exigences propres

**Interface et vie du jeu**
45. 🔜 Historique complet des confrontations entre deux clubs
46. 🔜 Notifications/alertes personnalisables
47. 🔜 Mode "simulation rapide" pour avancer plusieurs journées sans popup à chaque fois
48. 🔜 Statistiques comparatives entre plusieurs sauvegardes/carrières
49. 🔜 Export/partage de la sauvegarde (fichier au lieu du localStorage uniquement)
50. 🔜 Mode multijoueur local (plusieurs DS sur des clubs différents dans la même partie)

## Pourquoi les noms de clubs ne sont pas les vrais noms
Les vrais noms de clubs, joueurs et logos sont sous licence commerciale exclusive. J'ai utilisé la même approche que les jeux de gestion non-officiels : des noms génériques mais reconnaissables, associés aux vraies villes et aux vraies ligues.

## Limites connues de cette v4
- Seuls les 5 grands championnats ont été recalés précisément sur la hiérarchie 2024-2025 ; les 18 autres pays restent des représentations génériques plausibles.
- Pas de composition d'équipe détaillée : le calcul utilise toujours les meilleurs joueurs disponibles par ligne, sans que vous choisissiez individuellement les titulaires.
- La coupe continentale reste à élimination directe simple (pas de phase de groupes).
- Devises non converties entre elles.

## Structure du code
```
directeur-sportif/
├── index.html          → point d'entrée
├── style.css           → identité visuelle (thème "dossier de recrutement")
└── js/
    ├── data.js          → pays, villes, vraies ligues, clubs génériques D1, spécialisations/difficultés DS, fenêtres de mercato
    ├── engine.js         → génération du monde, calendrier, coupes, saisons, tactiques, blessures, finances, salaires, contrats, mercato
    └── app.js            → interface (écrans, navigation, popups, boîte de réception, finances, coupes, club)
```

