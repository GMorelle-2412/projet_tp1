// =============================================
// Variables
// =============================================

// Mot de passe vérifié sur la page "Mon compte"
var motDePasse = "";

// Liste des comptes reçue du serveur (page administration)
var comptes = [];


// =============================================
// Fonctions simples
// =============================================

// Est-ce que quelqu'un est connecté ?
function estConnecte() {
    return localStorage.getItem("token") !== null;
}

// Est-ce que l'utilisateur connecté est administrateur ?
function estAdmin() {
    return localStorage.getItem("admin") === "true";
}

// Affiche ou cache les boutons du menu
function majMenu() {
    var connecte = estConnecte();

    document.getElementById("navConnexion").hidden = connecte;
    document.getElementById("navInscription").hidden = connecte;
    document.getElementById("navProfil").hidden = !connecte;
    document.getElementById("navCompte").hidden = !connecte;
    document.getElementById("navAdmin").hidden = !(connecte && estAdmin());
}

// Affiche une seule page à la fois
function page(nom) {
    // Les pages privées demandent d'être connecté
    if ((nom === "profil" || nom === "compte" || nom === "admin") && !estConnecte()) {
        nom = "connexion";
    }

    // La page admin est réservée aux administrateurs
    if (nom === "admin" && !estAdmin()) {
        nom = "profil";
    }

    // On enlève "active" de toutes les pages
    var pages = document.querySelectorAll(".page");
    for (var i = 0; i < pages.length; i++) {
        pages[i].classList.remove("active");
    }

    // On affiche la page demandée
    document.getElementById(nom).classList.add("active");

    // Actions à faire en arrivant sur certaines pages
    if (nom === "profil") {
        document.getElementById("profilNom").textContent = localStorage.getItem("username");
    }
    if (nom === "compte") {
        reinitialiserCompte();
    }
    if (nom === "admin") {
        chargerComptes("");
    }

    majMenu();
}

// Envoie une requête au serveur avec le token (pour les actions de l'utilisateur connecté)
async function envoyer(url, methode, donnees) {
    var options = {
        method: methode,
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + localStorage.getItem("token")
        }
    };

    // On ajoute les données seulement s'il y en a
    if (donnees) {
        options.body = JSON.stringify(donnees);
    }

    var reponse = await fetch(url, options);

    // Token expiré ou invalide : on déconnecte
    if (reponse.status === 401) {
        deconnexion();
    }

    var resultat = await reponse.json();
    return { ok: reponse.ok, donnees: resultat };
}


// =============================================
// Inscription
// =============================================
async function inscription() {
    var username = document.getElementById("nom").value;
    var password = document.getElementById("password").value;
    var nomFamille = document.getElementById("nomFamille").value;
    var prenom = document.getElementById("prenom").value;
    var mail = document.getElementById("mail").value;
    var message = document.getElementById("messageInscription");

    // On vérifie que tout est rempli
    if (username === "" || password === "" || nomFamille === "" || prenom === "" || mail === "") {
        message.textContent = "Remplis tous les champs.";
        return;
    }

    try {
        var reponse = await fetch("/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                login: username,
                password: password,
                nom: nomFamille,
                prenom: prenom,
                mail: mail
            })
        });

        var resultat = await reponse.json();
        message.textContent = resultat.message;

        // Si ça a marché, on vide le formulaire et on va sur la connexion
        if (reponse.ok) {
            document.getElementById("nom").value = "";
            document.getElementById("password").value = "";
            document.getElementById("nomFamille").value = "";
            document.getElementById("prenom").value = "";
            document.getElementById("mail").value = "";
            page("connexion");
        }
    } catch (erreur) {
        message.textContent = "Impossible de contacter le serveur.";
    }
}


// =============================================
// Connexion et déconnexion
// =============================================
async function connexion() {
    var username = document.getElementById("nomConnexion").value;
    var password = document.getElementById("passwordConnexion").value;
    var message = document.getElementById("messageConnexion");

    if (username === "" || password === "") {
        message.textContent = "Remplis tous les champs.";
        return;
    }

    try {
        var reponse = await fetch("/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ login: username, password: password })
        });

        var resultat = await reponse.json();

        // Si la connexion a échoué, on affiche le message du serveur
        if (!reponse.ok || resultat.message !== "Connexion réussie") {
            message.textContent = resultat.message || "Connexion impossible.";
            return;
        }

        // On garde les infos de session dans le navigateur
        localStorage.setItem("token", resultat.token);
        localStorage.setItem("username", resultat.username);
        if (resultat.admin === true) {
            localStorage.setItem("admin", "true");
        } else {
            localStorage.setItem("admin", "false");
        }

        // On vide le formulaire et on va sur le profil
        document.getElementById("nomConnexion").value = "";
        document.getElementById("passwordConnexion").value = "";
        message.textContent = "";
        page("profil");
    } catch (erreur) {
        message.textContent = "Impossible de contacter le serveur.";
    }
}

function deconnexion() {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("admin");
    motDePasse = "";
    page("accueil");
}


// =============================================
// Supprimer mon compte (depuis le profil)
// =============================================
async function supprimerCompte() {
    var password = prompt("Entre ton mot de passe pour supprimer ton compte :");

    // Si l'utilisateur annule ou ne tape rien, on arrête
    if (!password) {
        return;
    }

    try {
        var resultat = await envoyer("/delete-account", "DELETE", { password: password });
        alert(resultat.donnees.message);

        // Si le compte est supprimé, on se déconnecte
        if (resultat.ok) {
            deconnexion();
        }
    } catch (erreur) {
        alert("Impossible de contacter le serveur.");
    }
}


// =============================================
// Page "Mon compte"
// =============================================

// Remet la page à l'étape 1 (demande du mot de passe)
function reinitialiserCompte() {
    motDePasse = "";
    document.getElementById("verifierMdp").value = "";
    document.getElementById("messageVerif").textContent = "";
    document.getElementById("messageModif").textContent = "";
    document.getElementById("champNouveauMdp").value = "";
    document.getElementById("zoneVerif").hidden = false;
    document.getElementById("zoneInfos").hidden = true;
}

// Étape 1 : le serveur vérifie le mot de passe
async function verifierMotDePasse() {
    var message = document.getElementById("messageVerif");
    var saisie = document.getElementById("verifierMdp").value;

    try {
        var resultat = await envoyer("/compte/infos", "POST", { password: saisie });

        // Mauvais mot de passe : on affiche l'erreur
        if (!resultat.ok) {
            message.textContent = resultat.donnees.message;
            return;
        }

        // On garde le mot de passe pour l'étape 2
        motDePasse = saisie;

        // On remplit le formulaire avec les infos reçues
        document.getElementById("champLogin").value = resultat.donnees.username;
        document.getElementById("champNom").value = resultat.donnees.nom || "";
        document.getElementById("champPrenom").value = resultat.donnees.prenom || "";
        document.getElementById("champMail").value = resultat.donnees.mail || "";

        // On cache l'étape 1 et on montre l'étape 2
        document.getElementById("zoneVerif").hidden = true;
        document.getElementById("zoneInfos").hidden = false;
    } catch (erreur) {
        message.textContent = "Impossible de contacter le serveur.";
    }
}

// Étape 2 : on enregistre les modifications
async function modifierCompte() {
    var message = document.getElementById("messageModif");
    var nouveau = document.getElementById("champNouveauMdp").value;

    try {
        var resultat = await envoyer("/compte", "PUT", {
            password: motDePasse,
            nom: document.getElementById("champNom").value,
            prenom: document.getElementById("champPrenom").value,
            mail: document.getElementById("champMail").value,
            nouveauPassword: nouveau
        });

        message.textContent = resultat.donnees.message;

        // Si le mot de passe a changé, on retient le nouveau
        if (resultat.ok && nouveau !== "") {
            motDePasse = nouveau;
            document.getElementById("champNouveauMdp").value = "";
        }
    } catch (erreur) {
        message.textContent = "Impossible de contacter le serveur.";
    }
}


// =============================================
// Page "Administration"
// =============================================

// Récupère les comptes et remplit la liste déroulante
async function chargerComptes(aSelectionner) {
    var message = document.getElementById("messageAdmin");

    try {
        var resultat = await envoyer("/users", "GET");

        if (!resultat.ok) {
            message.textContent = resultat.donnees.message;
            return;
        }

        comptes = resultat.donnees;

        var liste = document.getElementById("listeUsers");
        liste.innerHTML = "";
        liste.appendChild(new Option("-- Choisir un compte --", ""));

        // On ajoute chaque compte dans la liste
        for (var i = 0; i < comptes.length; i++) {
            var texte = comptes[i].username;
            if (comptes[i].admin === 1) {
                texte = texte + " (admin)";
            }
            liste.appendChild(new Option(texte, comptes[i].username));
        }

        liste.value = aSelectionner;
        afficherCompte();
    } catch (erreur) {
        message.textContent = "Impossible de contacter le serveur.";
    }
}

// Remplit le formulaire avec le compte choisi dans la liste
function afficherCompte() {
    var login = document.getElementById("listeUsers").value;
    var compte = null;

    // On cherche le compte qui correspond au login choisi
    for (var i = 0; i < comptes.length; i++) {
        if (comptes[i].username === login) {
            compte = comptes[i];
        }
    }

    // Aucun compte choisi : on cache le formulaire
    if (compte === null) {
        document.getElementById("zoneAdmin").hidden = true;
        return;
    }

    document.getElementById("zoneAdmin").hidden = false;
    document.getElementById("adminLogin").value = compte.username;
    document.getElementById("adminNom").value = compte.nom || "";
    document.getElementById("adminPrenom").value = compte.prenom || "";
    document.getElementById("adminMail").value = compte.mail || "";
    document.getElementById("adminAdmin").checked = (compte.admin === 1);
    document.getElementById("adminNouveauMdp").value = "";
    document.getElementById("messageAdmin").textContent = "";
}

// Modifie le compte choisi
async function adminModifier() {
    var login = document.getElementById("listeUsers").value;
    var message = document.getElementById("messageAdmin");

    try {
        var resultat = await envoyer("/users/" + encodeURIComponent(login), "PUT", {
            nom: document.getElementById("adminNom").value,
            prenom: document.getElementById("adminPrenom").value,
            mail: document.getElementById("adminMail").value,
            admin: document.getElementById("adminAdmin").checked,
            nouveauPassword: document.getElementById("adminNouveauMdp").value
        });

        // Si ça a marché, on recharge la liste
        if (resultat.ok) {
            await chargerComptes(login);
        }
        message.textContent = resultat.donnees.message;
    } catch (erreur) {
        message.textContent = "Impossible de contacter le serveur.";
    }
}

// Supprime le compte choisi
async function adminSupprimer() {
    var login = document.getElementById("listeUsers").value;
    var message = document.getElementById("messageAdmin");

    // On demande confirmation
    if (!confirm("Voulez-vous supprimer " + login + " ?")) {
        return;
    }

    try {
        var resultat = await envoyer("/users/" + encodeURIComponent(login), "DELETE");

        if (resultat.ok) {
            await chargerComptes("");
        }
        message.textContent = resultat.donnees.message;
    } catch (erreur) {
        message.textContent = "Impossible de contacter le serveur.";
    }
}


// =============================================
// Au chargement de la page
// =============================================
if (estConnecte()) {
    page("profil");
} else {
    majMenu();
}