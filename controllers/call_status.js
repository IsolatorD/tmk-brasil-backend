const express = require('express');
const router = express.Router();
const functions = require('./../config/helperFunctions.js');
const db = require('./../config/db.js').db;
var multer = require('multer'); // v1.0.5
var upload = multer(); // for parsing multipart/form-data
const errors = require('./../config/errorsCode.js');

router.post('/add', upload.array(), function(req, res) {

    db.oneOrNone('SELECT * FROM call_status WHERE name=${name} AND company_id=${id} AND status=${true}',{
        id: req.body.company_id,
        name: functions.firstToUpper(req.body.name.trim().toLowerCase()),
        true: true,
    }).then(data => {
        if (data != null) {
            functions.returnErrorData(res, errors.err401, 'O resultado da chamada já existe');
            return;
        } else {
            var effective;
            if(req.body.effective == 'Si') {
                effective = true;
            } else if (req.body.effective == 'No') {
                effective = false;
            }

            db.none('INSERT INTO call_status (effective, name, company_id, created_at, updated_at, form_id_mautic) VALUES (${effective}, ${name}, ${company_id}, ${date}, ${date}, ${form_id_mautic})',{
                effective: effective,
                name: functions.firstToUpper(req.body.name.trim().toLowerCase()),
                company_id: req.body.company_id,
                date: functions.date(),
                form_id_mautic: req.body.form_id_mautic,
            });
            functions.insertAudit(req.body.user_id, "Resultado da chamada", "registro", "Resultado da chamada registrado", req);
            functions.returnSuccessData(res, "Resultado da chamada registrado");
        }
    }).catch(error => {
        functions.errorBD(res, error, req.body.user_id, "Resultado da chamada", "registro", req);
        return;
    });
});

router.put('/update/:id', upload.array(), function(req, res) {

    db.oneOrNone('SELECT * FROM call_status WHERE name=${name} AND company_id=${id} AND status=${true}',{
        id: req.body.company_id,
        name: functions.firstToUpper(req.body.name.trim().toLowerCase()),
        true: true,
    }).then(data => {
        if (data != null) {
            if (data.id == req.params.id) {
                updateCondition();
            } else {
                functions.returnErrorData(res, errors.err401, 'O resultado da chamada já existe');
                return;
            }
        } else {
            updateCondition();
        }
    }).catch(error => {
        functions.errorBD(res, error, req.body.user_id, "Resultado da chamada", "atualização", req);
        return;
    });

    function updateCondition () {
        var effective;
        if(req.body.effective == 'Si') {
            effective = true;
        } else if (req.body.effective == 'No') {
            effective = false;
        }

        db.none('UPDATE call_status SET effective=${effective}, name=${name}, company_id=${company_id}, updated_at=${date}, form_id_mautic=${form_id_mautic} WHERE id=${id}',{
            id: req.params.id,
            effective: effective,
            name: functions.firstToUpper(req.body.name.trim().toLowerCase()),
            company_id: req.body.company_id,
            date: functions.date(),
            form_id_mautic: req.body.form_id_mautic,
        });
        functions.insertAudit(req.body.user_id, "Resultado da chamada", "atualização", "Resultados de chamada atualizadas", req);
        functions.returnSuccessData(res, "Resultados de chamada atualizadas");
    }
});

router.get('/view/:id/:user_id', upload.array(), function(req, res) {
    
    db.oneOrNone('SELECT * FROM call_status WHERE id=${id} AND status=${true}',{
        id: req.params.id,
        true: true,
    }).then(data => {
        if (data != null) {
            functions.returnSuccessData(res, data);
        } else {
            functions.returnErrorData(res, errors.err404, 'Não há dados');
            return;
        }
    }).catch(error => {
        functions.errorBD(res, error, req.params.user_id, "Resultados de chamada", "detalhe", req);
        return;
    });
});

router.get('/all/:id/:user_id', upload.array(), function(req, res) {
    
    db.manyOrNone('SELECT * FROM call_status WHERE company_id=${id} AND status=${true}',{
        id: req.params.id,
        true: true,
    }).then(data => {
        if (data != null && data.length > 0) {
            functions.returnSuccessData(res, data);
        } else {
            functions.returnErrorData(res, errors.err404, 'Não há dados');
            return;
        }
    }).catch(error => {
        functions.errorBD(res, error, req.params.user_id, "Resultados de chamada", "listar", req);
        return;
    });
});

router.delete('/delete/:id/:user_id', upload.array(), function(req, res) {
    
    db.oneOrNone('SELECT * FROM call_status WHERE id=${id}',{
        id: req.params.id,
    }).then(data => {
        if (data != null) {
            db.none("UPDATE call_status SET status=${false} WHERE id=${id}", {
                id: req.params.id,
                false: false,
            });
            functions.insertAudit(req.params.user_id, "Resultados de chamada", "eliminar", "Resultados de chamada removido", req);
            functions.returnSuccessData(res, "Resultados de chamada removido");
        } else {
            functions.returnErrorData(res, errors.err404, 'O resultado da chamada não existe');
            return;
        }
    }).catch(error => {
        functions.errorBD(res, error, req.params.user_id, "Resultados de chamada", "eliminar", req);
        return;
    });
});

module.exports = router;