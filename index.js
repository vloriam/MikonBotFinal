const makeWASocket = require('@adiwajshing/baileys').default;
const { useMultiFileAuthState, DisconnectReason, makeInMemoryStore, fetchLatestBaileysVersion } = require('@adiwajshing/baileys');
const { Boom } = require('@hapi/boom');
const express = require('express');
const mysql = require('mysql2');
const fs = require('fs');
const bodyParser = require('body-parser');
const qrcode = require('qrcode');
const pino = require('pino'); // Asegúrate de requerir pino para logs detallados


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

// Variable para almacenar el QR en base64
let qrCodeData = '';

// Store para mantener el estado de la conexión en memoria
const store = makeInMemoryStore({ logger: pino().child({ level: 'debug', stream: 'store' }) });

// Función para iniciar el bot
async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info_baileys');
    const { version } = await fetchLatestBaileysVersion(); // Obtiene la versión más reciente

    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: true, // No imprime el QR en la terminal ya que lo mostramos en la web
        logger: pino({ level: 'debug' }), // Habilitar logs detallados
        browser: ['Bot de WhatsApp', 'Safari', '1.0'],
    });

    // Vincula el store a los eventos del socket
    store.bind(sock.ev);

    sock.ev.on('connection.update', async (update) => {
        const { connection, qr, lastDisconnect } = update;
        if (qr) {
            // Generar el código QR en formato base64 y almacenarlo
            try {
            qrCodeData = await qrcode.toDataURL(qr);
            console.log('QR generado y almacenado');
            console.log('QR disponible en el navegador en http://localhost:3000/qr');
        } catch (err) {
            console.error('Error generando el QR:', err);
        }
    }

    if (connection === 'open') {
        console.log('Conexión establecida con WhatsApp');
    } else if (connection === 'close') {
        const shouldReconnect = (lastDisconnect.error === undefined || new Boom(lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut);
        console.log('Conexión cerrada, ¿debería reconectar?', shouldReconnect);
        if (shouldReconnect) {
            startBot(); // Reintentar la conexión
        }
    }
});

    sock.ev.on('creds.update', saveCreds);

    // Procesamiento de mensajes entrantes
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        const message = messages[0];
        if (!message.message) return;

        const text = message.message.conversation || '';
        const chatId = message.key.remoteJid;

        console.log(`Mensaje recibido: ${text} en ${chatId}`);

                // Manejo de comandos y autenticación del usuario
        if (text.toLowerCase() === 'hola') {
            currentUser = null;
            currentCategory = null;
            currentFormLink = null;
            await sock.sendMessage(chatId, { text: '¡Hola! Escribe tu usuario y contraseña en el formato: usuario contraseña (ejemplo: usuario1 pass1)' });
            return;
        }
        
        if (!currentUser) {
            const [user, password] = text.split(' ');
            // Verifica las credenciales en la base de datos
            db.query('SELECT * FROM users WHERE username = ? AND password = ?', [user, password], async (err, results) => {
                if (err) {
                    console.error('Error al consultar la base de datos:', err);
                    await sock.sendMessage(chatId, { text: 'Ocurrió un error al verificar tus credenciales. Inténtalo de nuevo.' });
                    return;
                }

                if (results.length === 0) {
                    await sock.sendMessage(chatId, { text: 'Usuario no válido o contraseña incorrecta. Por favor, inténtalo nuevamente.' });
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
                await sock.sendMessage(chatId, { text: response });
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
       await sock.sendMessage(chatId, { text: response + '\n\nSelecciona la letra del formato que deseas recibir.' });
                return;
            }

            if (currentCategory && /^[a-i]$/i.test(option)) {
                const formLink = links[currentCategory][option.toLowerCase()];
                if (!formLink) {
                    await sock.sendMessage(chatId, { text: 'Opción no válida. Por favor, selecciona una letra correcta.' });
                    return;
                }

                currentFormLink = formLink;
                await sock.sendMessage(chatId, { text: `Aquí está el enlace para el contrato seleccionado: ${formLink}` });
                await sock.sendMessage(chatId, { text: 'Escribe *listo* cuando hayas completado el formulario.' });
                return;
            }

            if (text.toLowerCase() === 'listo' && currentFormLink) {
                db.query('SELECT archivo_pdf FROM contratos WHERE numero_whatsapp = ?', [chatId], async (err, result) => {
                    if (err) {
                        console.error('Error al consultar la base de datos:', err);
                        await sock.sendMessage(chatId, { text: 'Ocurrió un error al procesar tu solicitud.' });
                        return;
                    }

                    if (result.length === 0) {
                        await sock.sendMessage(chatId, { text: 'No se encontró ningún archivo para tu número de WhatsApp.' });
                        return;
                    }

                    const filePath = result[0].archivo_pdf;
                    const fileBuffer = fs.readFileSync(filePath);

                    await sock.sendMessage(chatId, {
                        document: fileBuffer,
                        mimetype: 'application/pdf',
                        fileName: 'contrato.pdf',
                    });

                    await sock.sendMessage(chatId, { text: 'Aquí está tu contrato en formato PDF.' });
                    currentFormLink = null; // Restablecer el estado
                });
                return;
            }
        }
    });
}

// Ruta para mostrar el código QR en el navegador
app.get('/qr', (req, res) => {
     if (qrCodeData) {
        res.send(`<img src="${qrCodeData}" alt="QR Code">`);
    } else {  
         res.send('Generando QR, por favor espera...');
    }
});


// Iniciar servidor
app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
    startBot(); // Iniciar el bot de WhatsApp
});
// Middleware para manejo de errores en Express
app.use((err, req, res, next) => {
    console.error('Error en la aplicación:', err);
    res.status(500).send('Ocurrió un error en la aplicación. Por favor, inténtalo de nuevo más tarde.');
});
