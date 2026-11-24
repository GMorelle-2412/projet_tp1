require('dotenv').config();
const { SerialPort, ReadlineParser } = require('serialport');
const mysql = require('mysql2');

// ---------- 1. Le port série (l'autre port, change COM4) ----------
const port = new SerialPort({
    path: 'COM4',
    baudRate: 9600
});

// Le "parser" nous donne une trame complète à chaque ligne reçue
const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));


// ---------- 2. La base de données ----------
// (tu peux mettre cette partie en commentaire pour tester sans base)
const bdd = mysql.createConnection({
    host: process.env.HostBDD,
    user: process.env.LoginBDD,
    password: process.env.PasswordBDD,
    database: 'projet_auth'     
});

// ---------- 3. Convertir une coordonnée ----------
// Le GPS donne "4851.3960" : 48 degrés et 51.3960 minutes
// On veut des degrés décimaux : 48.8566
function convertir(valeur, direction) {
    var nombre = parseFloat(valeur);           // "4851.3960" devient 4851.3960
    var degres = Math.floor(nombre / 100);     // 48
    var minutes = nombre - degres * 100;       // 51.3960
    var resultat = degres + minutes / 60;      // 48.8566

    // Au Sud et à l'Ouest, le nombre est négatif
    if (direction === 'S' || direction === 'W') {
        resultat = -resultat;
    }

    return resultat;
}


// ---------- 4. Ce qu'on fait à chaque trame reçue ----------
parser.on('data', function (trame) {
    console.log('Reçu : ' + trame);

    // On ne garde que les trames GGA
    if (trame.indexOf('GGA') === -1) {
        console.log('Ce n\'est pas une trame GGA, on ignore.');
        return;
    }

    // On coupe la trame à chaque virgule
    // morceaux[0] = "$GPGGA", morceaux[1] = heure,
    // morceaux[2] = latitude, morceaux[3] = N ou S,
    // morceaux[4] = longitude, morceaux[5] = E ou W
    var morceaux = trame.split(',');

    var latitude = convertir(morceaux[2], morceaux[3]);
    var longitude = convertir(morceaux[4], morceaux[5]);

    console.log('Latitude : ' + latitude + ' / Longitude : ' + longitude);

    // On enregistre dans la base
    bdd.query(
        'INSERT INTO positions (latitude, longitude, heure) VALUES (?, ?, ?)',
        [latitude, longitude, morceaux[1]],
        function (erreur) {
            if (erreur) {
                console.log('Erreur base : ' + erreur.message);
            } else {
                console.log('Enregistré en base.');
            }
        }
    );
});

port.on('error', function (erreur) {
    console.log('Erreur : ' + erreur.message);
});