# Mini CRM

Application web de gestion de clients et de rendez-vous développée en **Node.js**, **Express**, **EJS** et **Sequelize**, avec une base **Microsoft SQL Server** exécutée via **Docker**.

---

## Objectif du projet

Ce projet a été réalisé dans le cadre d’une préparation de soutenance CDA (Concepteur Développeur d’Applications).

Il permet de :

- gérer des clients ;
- gérer des rendez-vous ;
- associer un ou plusieurs clients à un rendez-vous ;
- sécuriser l’accès à l’application ;
- préparer un déploiement simple et sécurisé.

---

## Stack technique

- **Back-end** : Node.js, Express
- **Front-end** : EJS
- **Base de données** : Microsoft SQL Server
- **ORM** : Sequelize
- **Tests** : Vitest, Supertest
- **Conteneurisation** : Docker

### Sécurité

- Helmet
- express-session (cookies sécurisés)
- CSRF (csurf)
- Rate limiting (anti brute force)
- bcrypt (hash des mots de passe)
- sanitation XSS

---

## Fonctionnalités

- authentification (inscription / connexion) ;
- CRUD clients ;
- CRUD rendez-vous ;
- association clients ↔ rendez-vous ;
- protection des routes ;
- contrôle d’accès (propriétaire) ;
- gestion des erreurs et messages utilisateur.

---

## Structure du projet

```txt
controllers/
middlewares/
models/
routes/
views/
public/
test/
app.js
server.js
docker-compose.yml