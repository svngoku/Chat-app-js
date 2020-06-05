const express = require("express")
const app = express()
const sockio = require('socket.io')();

app.use(express.static('public'))

const conn = {};
 
// Endpoint par défaut, récupère toutes les requêtes vers /.
app.get('/', function(req, res) {
  res.send('Hello Express');
});

// Endpoint sur la collection /conn, en GET afin de récupérer la liste des connection
// client.
app.get('/conn', function(req, res) {
    res.send(Object.keys(conn));
});

// Endpoint sur la collection /conn, en GET avec le paramètre "name" afin de récupérer
// la fiche de connection du client "name".
// Si la fiche n'existe pas, alors le serveur retourne 404, sinon il retourne la fiche.
app.get('/conn/:name', function(req, res) {
     let name = req.params.name;
    // Récupération de la fiche client de connection.
    if (typeof conn[name] === "undefined") {
        res.status(404);
        res.send();
    } else {
        res.send({time:conn[name].time});
    }
});

// Endpoint sur la collection /conn, en POST avec le paramètre "name" afin de créer
// la fiche de connection cliente appelée "name" si elle n'existe pas.
app.post('/conn/:name', function(req, res) {
    let name = req.params.name;

    // Ajout de la fiche client de connection.
    if (typeof conn[name] === "undefined") {
        conn[name] = {id: Date.now()};
    }

    res.send();
});

// Endpoint sur la collection /conn, en DELETE avec le paramètre "name" afin de supprimer
// la fiche de connection cliente appelée "name".
app.delete('/conn/:name', function(req, res) {
    let name = req.params.name;
    delete conn[name];
    res.send();
});

// Indique le port TCP d'écoute du serveur, puis lancement du serveur.
app.listen(8080, function() {
    console.log("Server running on port 8080");
});

sockio.on('connection', function(client) {
    conn[client.id] = {socket: client, time:Date.now()};

    // Envoi au client une enveloppe "Hello" incluant son ID.
    client.emit('hello', client.id);

    // Récéption des enveloppes "Hello" afin de prouver que le
    // client a bien reçu la précédente enveloppe "Hello".
    client.on('hello', function() {
        console.log(`[hello] - ${client.id}`);
    });

    // Récéption des enveloppes "Ping" envoyées par le client.
    client.on('ping_out', function() {
        console.log(`[ping_out] - ${client.id}`);
        client.emit('ping_in');
    });

    // Récéption des enveloppes "Message" envoyées par le client.
    client.on('message', function(msg) {
        console.log(`[msg] - ${client.id} : ${msg}`);

        for (let id in conn) {
            if (id !== client.id) {
                console.log(`[broadcast] - to ${id}`);
                conn[id].socket.emit('message', {src:client.id, data:msg});
            }
        }
    });

    // Récéption d'un événement d'erreur lié au client.
    client.on('error', function(error) {
        console.log(`Error sur le client ${client.id}:`, error);
    });

    // Récéption de l'événement de déconnection du client.
    client.on('disconnect', function(reason) {
        console.log(`Le client ${client.id} est déconnecté:`, reason);
        delete conn[client.id];
    });
});

sockio.listen(3000);
