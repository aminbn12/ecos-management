# Guide de déploiement ECOS sur XAMPP (Apache)

Ce guide explique comment faire servir toute l'application par **XAMPP Apache** (multi-threadé) sur votre PC local ou sur le serveur de la faculté.

---

## 1. Quel dossier copier dans XAMPP ?

> [!IMPORTANT]
> **Vous devez copier UNIQUEMENT le dossier `backend` dans `htdocs`.**
> Le dossier `frontend` sert uniquement au développement. Le script `build_production.bat` a déjà compilé et copié toute l'interface React à l'intérieur du dossier `backend/public`.

1. Copiez le dossier **`backend`** de votre projet.
2. Collez-le dans le dossier `htdocs` de XAMPP.
3. Renommez-le par exemple en **`ecos-app`** pour plus de clarté.
   - Chemin final : `C:\xampp\htdocs\ecos-app\`

---

## 2. Configurer la base de données locale (.env)

Ouvrez le fichier `C:\xampp\htdocs\ecos-app\.env` et modifiez les accès MySQL pour qu'ils correspondent à votre serveur MySQL XAMPP :

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=ecos_db   # Le nom de votre base sur XAMPP
DB_USERNAME=root
DB_PASSWORD=          # Laissez vide si XAMPP n'a pas de mot de passe
```

---

## 3. Accéder à l'application

1. Ouvrez le panneau de contrôle XAMPP.
2. Démarrez les modules **Apache** et **MySQL**.
3. Lancez votre navigateur internet à l'adresse suivante :
   `http://localhost/ecos-app/public/`

*Toutes les tablettes et appareils connectés au même réseau WiFi pourront y accéder en remplaçant `localhost` par l'adresse IP de votre PC (ex: `http://192.168.1.50/ecos-app/public/`).*

---

## 4. Déploiement final sur le serveur de la faculté

Le jour du déploiement final :
1. Compressez le dossier **`backend`** (qui contient l'interface fusionnée) en fichier `.zip`.
2. Donnez ce fichier `.zip` au service informatique de la faculté.
3. Ils n'auront qu'à le désarchiver sur leur serveur et ajuster les accès à la base de données dans le fichier `.env`.
