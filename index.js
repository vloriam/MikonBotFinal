const { default: makeWASocket, useSingleFileAuthState, downloadContentFromMessage } = require('@adiwajshing/baileys');
const qrcode = require('qrcode');
const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const mysql = require('mysql2');

const app = express();
const port = 3000;

app.use(bodyParser.json()); // Para manejar JSON en el webhook

//Configuracion de la conexion a MySQL

const db = mysql.createConnection({
    host:'162.215.253.218', //cambiar si es necesario
    user: 'fvtec1ae_mikondev', //tu usuario de mysql
    password: 'Asdf.4321$1', //tu contraseña de mysql
    database: 'fvtec1ae_mikonsultingbot' // tu base de datos
});

// Conexión a la base de datos
function connectToDatabase() {
    db.connect(err => {
        if (err) {
            console.error('Error conectando a la base de datos:', err);
            setTimeout(connectToDatabase, 2000); // Reintenta la conexión después de 2 segundos
        } else {
            console.log('Conectado a la base de datos MySQL');
        }
    });
}

// Reintentar la conexión al cerrarse
db.on('error', (err) => {
    console.error('Error en la conexión a la base de datos:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        connectToDatabase(); // Intenta reconectar si la conexión se pierde
    }
});

connectToDatabase(); // Llama a la función para conectarse


const links = {
    '1': { 'a': 'https://forms.fillout.com/t/rFuivxy4VZus', 'b': 'https://forms.fillout.com/t/jB8H97bfsgus', 'c': 'https://forms.fillout.com/t/ruA6WExP3bus' },
    '2': { 'a': 'https://forms.fillout.com/t/9qWmRX7etGus', 'b': 'https://forms.fillout.com/t/ay6S46jnW7us', 'c': 'https://forms.fillout.com/t/9bqczuTSWaus', 'd': 'https://forms.fillout.com/t/jB8H97bfsgus', 'e': 'https://forms.fillout.com/t/ruA6WExP3bus' },
    '3': { 'a': 'https://forms.fillout.com/t/9qWmRX7etGus', 'b': 'https://forms.fillout.com/t/ay6S46jnW7us', 'c': 'https://forms.fillout.com/t/9bqczuTSWaus', 'd': 'https://forms.fillout.com/t/jB8H97bfsgus', 'e': 'https://forms.fillout.com/t/ka9KicUaW3us', 'f': 'https://forms.fillout.com/t/ruA6WExP3bus', 'g': 'https://forms.fillout.com/t/vw8TSMDLKDus' },
    '4': { 'a': 'https://forms.fillout.com/t/9qWmRX7etGus' },
    '5': { 'a': 'https://forms.fillout.com/t/ndK1i73BRVus', 'b': 'https://forms.fillout.com/t/s2RDbvJtrrus', 'c': 'https://forms.fillout.com/t/tzcm4rwHQBus', 'd': 'https://forms.fillout.com/t/gWRLQaLVf6us', 'e': 'https://forms.fillout.com/t/wmCSkKdCvqus', 'f': 'https://forms.fillout.com/t/kp2J3xmBzSus', 'g': 'https://forms.fillout.com/t/54GjHJTesous', 'h': 'https://forms.fillout.com/t/ri9JtmNnLCus', 'i': 'https://forms.fillout.com/t/formato_designación_de_beneficiarios' }
};

let currentUser = null;
let currentCategory = null;
let currentFormLink = null;

// Inicializa el socket de Baileys
async function startBot() {
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true
    });

    sock.ev.on('creds.update', saveState);

    // Evento cuando se recibe un mensaje
    sock.ev.on('messages.upsert', async (msg) => {
        const message = msg.messages[0];
        const chatId = message.key.remoteJid;
        const text = message.message.conversation?.trim().toLowerCase() || '';

    console.log(`Mensaje recibido: ${text} en ${chatId}`);

    if (text === 'hola') {
        currentUser = null;
        currentCategory = null;
        currentFormLink = null;
        await sock.sendMessage(chatId, { text: '¡Hola! Gracias por elegir Mikonsulting. ¿Necesitas un contrato rápido y legal? ¡Nosotros te lo generamos en menos de un minuto! ⚡ Escribe tu usuario y contraseña en el formato: usuario contraseña (ejemplo: usuario1 pass1)' });
            return;
    }

    if (!currentUser) {
        const [user, password] = text.split(' ');
        // Verifica las credenciales en la base de datos
        db.query('SELECT * FROM users WHERE username = ? AND password = ?', [user, password], (err, results) => {
            if (err) {
                console.error('Error al consultar la base de datos:', err);
                sock.sendMessage(chatId, { text: 'Ocurrió un error al verificar tus credenciales. Inténtalo de nuevo.' });
                    return;
                }

                if (results.length === 0) {
                    sock.sendMessage(chatId, { text: 'Usuario no válido o contraseña incorrecta. Por favor, inténtalo nuevamente.' });
                    return;
            }

            currentUser = results[0]; // Asignar el usuario autenticado
            const options = ['1', '2', '3', '4', '5'];
            const availableOptions = options.filter(option => currentUser.access.includes(option));
            const response = `Bienvenido ${user}. Tienes acceso a los siguientes contratos:\n` +
                            `1. Contratos para Emprendedores\n` +
                            `2. Contratos para Pymes\n` +
                            `3. Contratos Empresariales\n` +
                            `4. Contratos de Arrendamiento\n` +
                            `5. Contratos Especializados\n\n` +
                            `Selecciona el número de la opción que te interesa.`;
            sock.sendMessage(chatId, { text: response });
        });
        return;
    }


   // Manejo de opciones disponibles
   if (currentUser) {
    const option = text;

    // Procesa la opción seleccionada
    if (['1', '2', '3', '4', '5'].includes(option)) {
        if (!currentUser.access.includes(option)) {
            await sock.sendMessage(chatId, { text: 'Lo siento, no tienes acceso a esta opción. Contacta a ventas.' });
                    return;
                }

        currentCategory = option;
        let response = '';
        switch (option) {
            case '1':
                response = 'Seleccionaste Contratos para Emprendedores. Opciones disponibles:\n' +
                           'a. Contrato individual de trabajo\n' +
                           'b. Convenio de confidencialidad\n' +
                           'c. Formato de renuncia';
                break;
            case '2':
                response = 'Seleccionaste Contratos para Pymes. Opciones disponibles:\n' +
                           'a. Contrato de arrendamiento\n' +
                           'b. Prestación de servicios profesionales\n' +
                           'c. Contrato individual de trabajo indeterminado\n' +
                           'd. Convenio de confidencialidad\n' +
                           'e. Formato de renuncia';
                break;
            case '3':
                response = 'Seleccionaste Contratos Empresariales. Opciones disponibles:\n' +
                           'a. Contrato de arrendamiento\n' +
                           'b. Contrato de prestación de servicios profesionales\n' +
                           'c. Contrato individual de trabajo indeterminado\n' +
                           'd. Convenio de confidencialidad\n' +
                           'e. Política de corrupción y lavado de dinero\n' +
                           'f. Formato de renuncia\n' +
                           'g. Periodo de prueba';
                break;
            case '4':
                response = 'Seleccionaste Contratos de Arrendamiento. Opciones disponibles:\n' +
                           'a. Contrato de arrendamiento';
                break;
            case '5':
                response = 'Seleccionaste Contratos Especializados. Opciones disponibles:\n' +
                           'a. Carátula conservador persona física + contrato conservador\n' +
                       'b. Carátula conservador persona moral + contrato conservador\n' +
                       'c. Carátula moderado persona física + contrato moderado\n' +
                       'd. Carátula moderado persona moral + contrato moderado\n' +
                       'e. Carátula agresivo persona física + contrato agresivo\n' +
                       'f. Carátula agresivo persona moral + contrato agresivo\n' +
                       'g. Carátula persona física liquidity + contrato liquidity\n' +
                       'h. Carátula persona moral liquidity + contrato liquidity\n' +
                       'i. KPI';
                break;
        }
        await sock.sendMessage(chatId, { text: response });
        return;
    }

  // Manejo de sub-opciones
            if (currentCategory) {
                const subOption = text;

                if (links[currentCategory] && links[currentCategory][subOption]) {
                    currentFormLink = links[currentCategory][subOption];
                    await sock.sendMessage(chatId, { text: `Por favor, completa el formulario en este enlace: ${currentFormLink}` });
                    return;
                }
                await sock.sendMessage(chatId, { text: 'Opción no válida. Por favor, selecciona una opción válida.' });
                return;
            }
        }

        // Manejo del comando "listo"
        if (text === 'listo') {
            // Consulta el archivo PDF correspondiente en la base de datos
            db.query('SELECT archivo_pdf FROM contratos WHERE numero_whatsapp = ?', [chatId], async (err, results) => {
                if (err) {
                    console.error('Error al consultar la base de datos:', err);
                    await sock.sendMessage(chatId, { text: 'Ocurrió un error al intentar enviar el contrato. Inténtalo de nuevo.' });
                    return;
                }

                if (results.length === 0) {
                    await sock.sendMessage(chatId, { text: 'No se encontró un contrato asociado a este número.' });
                    return;
                }

                const archivoPdf = results[0].archivo_pdf;

                // Envío del archivo PDF
                await sock.sendMessage(chatId, {
                    document: fs.readFileSync(archivoPdf), // Asegúrate de que la ruta del archivo sea correcta
                    mimetype: 'application/pdf',
                    fileName: 'Contrato.pdf', // Nombre que tendrá el archivo al ser descargado
                    caption: 'Aquí tienes tu contrato solicitado.'
                });
                await sock.sendMessage(chatId, { text: 'Contrato enviado con éxito.' });
                return;
            });
        }
    });

    // Evento de conexión
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            if ((lastDisconnect.error && lastDisconnect.error.output.statusCode !== 401) || lastDisconnect.error) {
                console.log('Conexión cerrada, intentando reconectar...');
                startBot();
            } else {
                console.log('Conexión cerrada por el cliente');
            }
        } else if (connection === 'open') {
            console.log('Conectado exitosamente al servicio de WhatsApp');
        }
    });

    return sock;
}

startBot();

// Inicia el servidor Express
app.listen(port, '0.0.0.0', () => {
    console.log(`Servidor escuchando en http://0.0.0.0:${port}`);
});
