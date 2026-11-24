// On charge l'outil pour utiliser le port série
const { SerialPort } = require('serialport');

// On ouvre le port (change COM3 par ton port)
const port = new SerialPort({
    path: 'COM3',
    baudRate: 9600
});

// Les trames GPS qu'on va envoyer : Paris, Rome, Tokyo, Rio
const trames = [
    '$GPGGA,123519,4851.3960,N,00221.1320,E,1,08,0.9,35.0,M,46.9,M,,*76',
    '$GPGGA,123519,4154.1680,N,01229.7840,E,1,08,0.9,35.0,M,46.9,M,,*7B',
    '$GPGGA,123519,3540.5720,N,13939.0180,E,1,08,0.9,35.0,M,46.9,M,,*79',
    '$GPGGA,123519,2254.1700,S,04312.5800,W,1,08,0.9,35.0,M,46.9,M,,*72'
];

// Numéro de la trame à envoyer (on commence par la première)
var numero = 0;

// Quand le port est ouvert, on commence à envoyer
port.on('open', function () {
    console.log('Port ouvert');

    // Toutes les 2 secondes (2000 ms), on envoie une trame
    setInterval(function () {
        port.write(trames[numero] + '\r\n');
        console.log('Envoyé : ' + trames[numero]);

        // On passe à la trame suivante, et on revient à 0 après la dernière
        numero = numero + 1;
        if (numero === trames.length) {
            numero = 0;
        }
    }, 2000);
});

// Si le port ne s'ouvre pas, on affiche l'erreur
port.on('error', function (erreur) {
    console.log('Erreur : ' + erreur.message);
});