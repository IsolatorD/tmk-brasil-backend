const express = require('express');
const router = express.Router();
const functions = require('./../config/helperFunctions.js');
const db = require('./../config/db.js').db;
var multer = require('multer'); // v1.0.5
var upload = multer(); // for parsing multipart/form-data
const errors = require('./../config/errorsCode.js');

/*router.post('/add', upload.array(), function(req, res) {
    
    db.oneOrNone('SELECT * FROM permission WHERE name = ${name} AND status = ${true}',{
        name: req.body.name.trim().toLowerCase(),
        true: true,
    }).then(data => {
        if (data != null) {
            functions.returnErrorData(res, errors.err401, 'El privilegio ya existe');
            return;
        } else {
            db.none('INSERT INTO permission (name, _controller, _method, created_at, updated_at) VALUES (${name}, ${controller}, ${method}, ${date}, ${date})',{
                name: req.body.name.trim().toLowerCase(),
                controller: functions.firstToUpper(req.body.controller.trim().toLowerCase()),
                method: functions.firstToUpper(req.body.method.trim().toLowerCase()),
                date: functions.date(),
            });
            functions.insertAudit(req.body.user_id, "Permisos", "registro", "Privilegio registrado", req);
            functions.returnSuccessData(res, "Privilegio registrado");
        }
    }).catch(error => {
        functions.errorBD(res, error, req.body.user_id, "Permisos", "registro", req);
        return;
    });
});*/

router.get('/all/:user_id', upload.array(), function(req, res) {
    
    db.manyOrNone('SELECT id, name, _controller, _method FROM permission WHERE status = ${true}',{
        true:true,
    }).then(data => {
        if (data != null && data.length > 0) {
            functions.returnSuccessData(res, data);
        } else {
            functions.returnErrorData(res, errors.err404, 'Não há dados');
            return;
        }
    }).catch(error => {
        functions.errorBD(res, error, req.params.user_id, "Permissões", "listar", req);
        return;
    });
});

module.exports = router;