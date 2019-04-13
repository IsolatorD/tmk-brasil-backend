var express = require('express');
var router = express.Router();
var functions = require('./../config/helperFunctions.js');
var db = require('./../config/db.js').db;
var bcrypt = require('bcrypt-nodejs');
var multer = require('multer'); // v1.0.5
var upload = multer(); // for parsing multipart/form-data
var errors = require('./../config/errorsCode.js');
var jwt = require('jsonwebtoken');

router.post('/login/:ip', upload.array(), function(req, res) {
    
    db.oneOrNone('SELECT u.*, r.name AS role_name FROM users u, role r WHERE u.email=${email} AND r.status = ${true} AND u.role_id=r.id',{
        email: req.body.email.trim(),
        true: true,
    }).then(data => {
        if (data != null) {
            if (!data.status || !data.estatus) return functions.returnErrorData(res, errors.err401, 'O usuário não está ativo.');
            bcrypt.compare(req.body.password.trim(), data.encrypted_password, function(err, response) {
                if(response == true) {
                    // iniciar sesion
                    db.oneOrNone("UPDATE users SET sign_in_count=${sign_in_count}, current_sign_in_at=${current_sign_in_at}, current_sign_in_ip=${current_sign_in_ip} WHERE id=${id} RETURNING *", {
                        id: data.id,
                        sign_in_count: data.sign_in_count + 1,
                        current_sign_in_at: functions.date(),
                        current_sign_in_ip: req.params.ip,
                    }).then(user => {
                        if (user != null) {
                            let token = jwt.sign(JSON.stringify(data), 'tMkB4cK3nDp4UlUs');
                            functions.returnSuccessData(res, data, token);
                        } else {
                            functions.returnErrorData(res, errors.err503, 'Ocorreu um erro com o login, tente novamente');
                            return;
                        }
                    }).catch(error => {
                        functions.errorBD(res, error, 0, "Autenticação", "login", req);
                    });
                } else {
                    functions.returnErrorData(res, errors.err401, 'A chave invalida');
                    return;
                }
            });
        } else {
            functions.returnErrorData(res, errors.err401, 'Usuário inválido');
            return;
        }
    }).catch(error => {
        functions.errorBD(res, error, 0, "Autenticação", "login", req);
        return;
    });
});

router.get('/logout/:id/:ip', upload.array(), function(req, res) {
    // cerrar sesion
    db.oneOrNone("UPDATE users SET last_sign_in_at=${last_sign_in_at}, last_sign_in_ip=${last_sign_in_ip} WHERE id=${id} RETURNING *", {
        id: req.params.id,
        last_sign_in_at: functions.date(),
        last_sign_in_ip: req.params.ip,
    }).then(data => {
        if (data != null) {
            functions.returnSuccessData(res, true);
        } else {
            functions.returnErrorData(res, errors.err503, 'Ocorreu um erro com o logout, tente novamente');
            return;
        }
    }).catch(error => {
        functions.errorBD(res, error, 0, "Autenticação", "logout", req);
        return;
    });
});

module.exports = router;