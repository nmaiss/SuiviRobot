# [@SuiviRobot](https://t.me/suivirobot) Telegram bot code

Ce bot (non officiel) vous permet de suivre facilement vos lettres et colis en les enregistrant et recevant des notifications sans sortir de Telegram.
## Installation
### Lancement local

1. Clonez ce dépôt : ```git clone https://github.com/nmaiss/LaPosteBot```
2. Lancer la base de [données mongo](https://www.mongodb.com/) localement
3. Créez ```.env``` avec les variables d'environnement ci-dessous
4. ```npm install```
5. ```node index.js```

Et ça devra être bon ! N'hésitez pas à forker et soumettre des pull requests. Merci!

### Variables d'environnement

- ```TOKEN``` — token du bot Telegram
- ```MONGO``` — URL de le base de données mongo
- ```POSTE``` — token de l'API de la [poste](https://developer.laposte.fr/products/suivi/latest)

Aussi, s'il vous plaît, pensez à regarder ```.env.sample```.

## Contributions
Les pull requests sont les bienvenus. Pour les changements majeurs, veuillez d'abord ouvrir une issue pour discuter de ce que vous aimeriez changer.

## License
MIT — peut donc être utilisé à toute fin. Ce serait sympa si vous pouviez mentionner les développeurs d'origine. Merci!
