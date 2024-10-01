const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
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

// Variable para almacenar el QR en base64
let qrCodeData = '';

const client = new Client({
    authStrategy: new LocalAuth()
});

client.on('qr', (qr) => {
    // Generar el QR en formato base64
    qrcode.toDataURL(qr, (err, url) => {
        if (err) {
            console.error('Error generando el QR:', err);
            return;
        }
        qrCodeData = url;  // Almacena el QR en base64 en la variable qrCodeData
        console.log('QR generado y disponible en http://localhost:3000/qr para escanear');
    });
});

client.on('disconnected', (reason) => {
    console.log('Desconectado:', reason);
});

client.on('auth_failure', (msg) => {
    console.error('Error de autenticación:', msg);
});

client.on('ready', () => {
    console.log('El bot está listo y conectado a WhatsApp');
});

client.on('message', async message => {
    const text = message.body.trim().toLowerCase();
    const chatId = message.from;

    console.log(`Mensaje recibido: ${text} en ${chatId}`);

    if (text === 'hola') {
        currentUser = null;
        currentCategory = null;
        currentFormLink = null;
        message.reply('¡Hola! Gracias por elegir Mikonsulting. ¿Necesitas un contrato rápido y legal? ¡Nosotros te lo generamos en menos de un minuto! ⚡ Conoce más sobre nuestros servicios y ten el control legal de tus proyectos.\n\nEscribe tu usuario y contraseña en el formato: usuario contraseña (ejemplo: usuario1 pass1)');
        return;
    }

    if (!currentUser) {
        const [user, password] = text.split(' ');
        // Verifica las credenciales en la base de datos
        db.query('SELECT * FROM users WHERE username = ? AND password = ?', [user, password], (err, results) => {
            if (err) {
                console.error('Error al consultar la base de datos:', err);
                message.reply('Ocurrió un error al verificar tus credenciales. Inténtalo de nuevo.');
                return;
            }

            if (results.length === 0) {
                message.reply('Usuario no válido o contraseña incorrecta. Por favor, inténtalo nuevamente.');
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
            message.reply(response);
        });
        return;
    }


   // Manejo de opciones disponibles
   if (currentUser) {
    const option = text;

    // Procesa la opción seleccionada
    if (['1', '2', '3', '4', '5'].includes(option)) {
        if (!currentUser.access.includes(option)) {
            message.reply('Lo siento, no tienes acceso a esta opción. Contacta a ventas.');
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
        message.reply(response);
        return;
    }

   // Manejo de opciones dentro de las categorías
   if (currentCategory && Object.keys(links[currentCategory]).includes(text)) {
    currentFormLink = links[currentCategory][text];
    message.reply(`Aquí tienes el enlace al formulario: ${currentFormLink}\n\nEscribe "listo" para enviar el contrato.`);
    return;
}

// Verificar si el usuario escribe "listo"
if (text === 'listo') {
    // Normaliza el número de WhatsApp
    const normalizedNumber = chatId.replace(/[^0-9]/g, ''); // Elimina caracteres no numéricos

    // Realiza la búsqueda en la base de datos
    db.query('SELECT archivo_pdf FROM contratos WHERE numero_whatsapp = ?', [normalizedNumber], (err, results) => {
        if (err) {
            console.error('Error al consultar la base de datos:', err);
            message.reply('Ocurrió un error al buscar tu contrato. Inténtalo de nuevo.');
            return;
        }

        if (results.length === 0) {
            message.reply('No se encontró un contrato asociado a tu número de WhatsApp.');
            return;
        }

        const mediaUrl = results[0].archivo_pdf;
        console.log('Media URL recuperada:', mediaUrl);

        if (!mediaUrl) {
            message.reply('No se encontró la URL del contrato en la base de datos.');
            return;
        }

        // Codificar la URL para evitar problemas de caracteres especiales
    const encodedUrl = encodeURI(mediaUrl); // Codificar caracteres especiales en la URL

    // Asegúrate de que la URL es válida
    try {
        const url = new URL(encodedUrl); // Validar la URL codificada
    } catch (error) {
        console.error('URL inválida:', encodedUrl);
        message.reply('La URL del contrato no es válida.');
        return;
    }


        // Enviar el archivo por WhatsApp usando la URL del archivo
        MessageMedia.fromUrl(encodedUrl, { unsafeMime: true}) // Agregar { unsafeMime: true }
            .then(media => {
                client.sendMessage(chatId, media)
                    .then(() => {
                        message.reply('Tu contrato ha sido enviado. ¡Gracias por usar Mikonsulting!');
                    })
                    .catch(err => {
                        console.error('Error enviando el contrato:', err);
                        message.reply('Ocurrió un error al enviar el contrato. Inténtalo de nuevo.');
                    });
            })
            .catch(err => {
                console.error('Error descargando el archivo:', err);
                message.reply('Ocurrió un error al descargar el contrato. Inténtalo de nuevo.');
            });
    });
}
}
});

// Inicia el cliente de WhatsApp
client.initialize();

// Endpoint para obtener el QR en base64
app.get('/qr', (req, res) => {
if (qrCodeData) {
res.send(`<img src="${qrCodeData}">`);
} else {
res.send('No hay QR disponible. Espera un momento...');
}
});

app.listen(port, '0.0.0.0' () => {
console.log(`Servidor corriendo en http://0.0.0.0:${port}`);
});
