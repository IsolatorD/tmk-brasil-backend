const express = require('express');
const router = express.Router();
const functions = require('./../config/helperFunctions.js');
const db = require('./../config/db.js').db;
var multer = require('multer'); // v1.0.5
var upload = multer(); // for parsing multipart/form-data
const errors = require('./../config/errorsCode.js');

router.get('/all/:user_id', upload.array(), function(req, res) {

    // TODO: agregar user_id
    
    db.manyOrNone('SELECT a.*, u.first_name, u.last_name FROM audit a, users u ' +
    'WHERE a.user_id=u.id AND u.status=${true} ORDER BY a.id DESC LIMIT 100',{
        true: true,
    }).then(data => {
        if (data != null) {
            functions.returnSuccessData(res, data);
        } else {
            functions.returnErrorData(res, errors.err404, 'Não há dados');
            return;
        }
    }).catch(error => {
        functions.errorBD(res, error, req.params.user_id, "Auditoria", "listar", req);
        return;
    });
});

module.exports = router;