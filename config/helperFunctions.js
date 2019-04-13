const errors = require('./errorsCode.js');
const db = require('./db.js').db;
const logger = require('./winston.js');
const useragent = require('useragent');
const crypto = require('crypto');

// ENCRIPTA 
exports.encrypt = function (plaintext) {
    let cipher = crypto.createCipher('aes-256-cbc', this.ENCRYPTION_KEY)
    let encrypted = cipher.update(String(plaintext), 'utf8', 'base64'); // binary base64 el metodo binary no sirve, genera problemas aleatorios
    return encrypted += cipher.final('base64'); // variable encrypted
}

// DESENCRIPTA 
exports.decrypt = function (encrypted) {
    let decipher = crypto.createDecipher('aes-256-cbc', this.ENCRYPTION_KEY);
    let decrypted = decipher.update(String(encrypted), 'base64', 'utf8'); // variable encrypted
    return decrypted += decipher.final('utf8');
}

exports.printRoute = (req) => {
    console.log(`------Route Server: ${req.url}------`);
}

exports.returnErrorData = (res, codeError, error, errorDetail="") => {
    let returnObject = {
        codeError,
        error
    };
    logger.log('error', `${codeError}. ${error}. ${errorDetail}`);
    return res.send(returnObject);
}

exports.returnSuccessData = (res, data, token = null) => {
    let returnObject;
    if (token !== null) {
        returnObject = {
            data: data,
            codeError: false,
            jwt: token,
        };
    } else {
        returnObject = {
            data: data,
            codeError: false,
        };
    }
    //logger.log('info', data)
    console.log(data);
    res.send(returnObject);
    return;
}

exports.errorBD = (res, error, user_id, controller, action, req) => {
    logger.log('error', `${controller} ${action}. A consulta ao banco de dados não pôde ser processada: ${error}`);
    this.insertAudit(user_id, controller, action, `A consulta ao banco de dados não pôde ser processada: ${error}`, req);
    this.returnErrorData(res, errors.err503, `Não foi possível processar a consulta para o banco de dados, verifique se os dados estão corretos`);
}

exports.date = () => {
    var d = new Date,
    anio = d.getFullYear(),
    mes = d.getMonth()+1,
    dia = d.getDate(),
    hora = d.getHours(),
    minuto = d.getMinutes(),
    segundo = d.getSeconds();

    if (dia < 10) {
        dia = `0${dia}`;
    }
    if (mes < 10) {
        mes = `0${mes}`;
    }
    if (hora < 10) {
        hora = `0${hora}`;
    }
    if (minuto < 10) {
        minuto = `0${minuto}`;
    }
    if (segundo < 10) {
        segundo = `0${segundo}`;
    }

    return `${anio}-${mes}-${dia} ${hora}:${minuto}:${segundo}`;
}

exports.firstToUpper = (string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

exports.filterDateToQuery = (option) => {
    var date;
    var fecha = new Date();
    
    if (option=='1w') {
        fecha.setDate(fecha.getDate() - 7); // hace 1 semana (7 dias) hasta hoy
    } else if (option=='4w') {
        fecha.setDate(fecha.getDate() - 28); // hace 4 semanas (28 dias) hasta hoy
    } else if (option=='1y') {
        fecha.setFullYear(fecha.getFullYear() - 1); // hace 1 año hasta hoy
    } else if (option=='Mtd') {
        fecha.setMonth(fecha.getMonth() - 1); // hace 1 mes hasta hoy
    } else if (option=='Ttd') {
        fecha.setMonth(fecha.getMonth() - 3); // hace 3 meses hasta hoy
    } else if (option=='Qtd') {
        fecha.setMonth(fecha.getMonth() - 4); // hace 4 meses hasta hoy
    } else if (option=='Std') {
        fecha.setMonth(fecha.getMonth() - 6); // hace 6 meses hasta hoy
    } else if (option=='All') {
        fecha.setFullYear(2000, 0, 1); // desde el 2000 hasta hoy
    } else if (option=='Tmt') {
        fecha.setDate(1); // todo este mes
    } else if (option=='Tyt') {
        fecha.setDate(1); // todo este año
        fecha.setMonth(0);
    }

    anio = fecha.getFullYear(),
    mes = fecha.getMonth()+1;
    dia = fecha.getDate();

    if (mes < 10) {
        mes = `0${mes}`;
    }
    if (dia < 10) {
        dia = `0${dia}`;
    }

    date = `${anio}-${mes}-${dia} 00:00:00`;

    return date;
}

exports.insertAudit = (user_id, controller, action, note, req) => {

    if (useragent.is(req.headers['user-agent']).chrome) {
        var navigator = 'Chrome';
    } else if (useragent.is(req.headers['user-agent']).firefox) {
        var navigator = 'Firefox';
    } else if (useragent.is(req.headers['user-agent']).ie) {
        var navigator = 'Internet Explorer';
    } else if (useragent.is(req.headers['user-agent']).mobile_safari) {
        var navigator = 'Mobile Safari';
    } else if (useragent.is(req.headers['user-agent']).opera) {
        var navigator = 'Opera';
    } else if (useragent.is(req.headers['user-agent']).safari) {
        var navigator = 'Safari';
    } else if (useragent.is(req.headers['user-agent']).android) {
        var navigator = 'Android';
    }

    console.log("*********IP*********");
    console.log(req.connection.remoteAddress); // local ::1 ngninx ::ffff:127.0.0.1
    console.log(req.socket.remoteAddress); // local ::1 nginx ::ffff:127.0.0.1
    console.log(req.headers['x-forwarded-for']); // local undefined nginx ip real
    console.log(req.ip); // local ::1 nginx ip real 
    console.log("*********END-IP*********");

    var ip = req.params.ip ? req.params.ip : req.ip;

    db.oneOrNone("INSERT INTO audit (user_id, controller, action, note, date, ip, navigator) VALUES (${user_id}, ${controller}, ${action}, ${note}, ${date}, ${ip}, ${navigator}) RETURNING *", {
      user_id,
      controller,
      action,
      note,
      date: this.date(),
      ip,
      navigator,
    }).then(() => {
      console.log("Registro de auditoría.");
    }).catch(error => {
        logger.log("error", `Auditoría Registro, error al registrar auditoria, ${error}`);
    });
}

exports.insertHistoric = (req, event_name, sms, reference_id, status, campain_id, origin_data) => {
    // event : Intenção de doação
    // event : Resultado do contato
	// event : Não contatado
	// event : Registro || Atualização
    db.none('INSERT INTO historic (event, description, user_id, company_id, client_id, date, reference_id, status, campain_id, origin_data) VALUES (${event}, ${description}, ${user_id}, ${company_id}, ${client_id}, ${date}, ${reference_id}, ${status}, ${campain_id}, ${origin_data})',{
        event: event_name,
        description: sms,
        user_id: req.body.user_id,
        company_id: req.body.company_id ? req.body.company_id : 0,
        client_id: req.body.client_id,
        date: this.date(),
        reference_id: reference_id, // numero o 0
        status: status, // true o false
        campain_id: campain_id,  // numero o 0
        origin_data: origin_data.trim(),
    });
}

exports.runMaintenanceScript = async () => {
    console.log("CORRIENDO SCRIPT DE MANTENIMIENTO...");
    try {
        /* PARA ACOMODAR LAS URLs...
        console.log("OBTENIENDO DATOS...");
        let urls = await db.manyOrNone("SELECT id, origin_data FROM historic WHERE origin_data LIKE ${like}", {
            like: '%http%'
        });
        console.log("DATOS OBTENIDOS!");
        console.log("CORRIENDO CICLO... POR FAVOR ESPERE...");
        for (let i = 0; i < urls.length; i++) {
            let newUrl = urls[i].origin_data.split('?'), id = urls[i].id;
            await db.none("UPDATE historic SET origin_data=${newUrl} WHERE id=${id}", {
                newUrl: newUrl[0],
                id,
            });
        }
        console.log("CICLO FINALIZADO! REVISE LA DATA");
        */

        /*console.log("ACTUALIZANDO DATOS!");
        await db.none("UPDATE donations SET ipca=${true}", {
            true: true
        });
        console.log("DATOS ACTUALIZADOS!");*/
    } catch (error) {
        logger.log("error", `SCRIPT DE MANTENIMIENTO: ${error}`);
    }
    console.log("FIN DEL SCRIPT DE MANTENIMIENTO.");
}

exports.origin_data = "Website";
exports.ENCRYPTION_KEY = "xss7fleaqunhxk13tl7tq39souox7bkf";