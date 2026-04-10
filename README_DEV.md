# Mini CRM – Node.js / Sequelize / SQL Server
Mini CRM développé en **Node.js** avec **Sequelize ORM** et **Microsoft SQL Server** exécuté via **Docker**.


## Prérequis
- Node.js ≥ 18
- npm
- Docker + Docker Compose
- VS Code (optionnel, avec extension SQL Server)

## Installation & Lancement

# Cloner le projet
git clone https://github.com/Replicator56/mini-crm-nodejs.git
cd mini-crm-nodejs

# Installer les dépendances
npm install

# Créer le fichier .env
DB_NAME=mini_crm
DB_USER=sa
DB_PASSWORD=XXXXXXXXX
DB_HOST=localhost
PORT=3000

# Lancer SQL Server avec Docker Compose
docker compose up -d

# Créer la base de données (une seule fois)
# Via VS Code (extension SQL Server) ou tout autre client SQL
CREATE DATABASE mini_crm;
GO

# Lancer l’application
npm start
 ou en mode developpement
npm run dev

# SQL Server est accessible sur localhost:1433


# Commandes Docker utiles
docker compose up -d        # démarrer
docker compose down         # arrêter
docker ps                   # vérifier
docker logs mini-crm-sqlserver




HELP ME!
#####
# Démarrer le conteneur SQL Server
docker run -e "ACCEPT_EULA=Y" \
  -e "SA_PASSWORD=XXXXXXXXXX" \
  -p 1433:1433 \
  --name mini-crm-sqlserver \
  -d mcr.microsoft.com/mssql/server:2022-latest

# Supprimer l’ancien conteneur
docker rm -f mini-crm-sqlserver

# Vérifier que le conteneur tourne :
docker ps


# Créer la base mini_crm
# Option recommandée : VS Code (extension SQL Server)
Ouvre VS Code
Clique sur l’icône SQL Server
Ajoute une connexion avec :
Server name : localhost,1433
Authentication : SQL Login
User : sa
Password : XXXXXXXXXXX
Trust server certificate
Database : laisser vide
Clique sur New Query
Exécute :
CREATE DATABASE mini_crm;
GO

#####