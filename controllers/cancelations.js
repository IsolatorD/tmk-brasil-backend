const express = require('express');
const router = express.Router();
const functions = require('./../config/helperFunctions.js');
const db = require('./../config/db.js').db;
var multer = require('multer'); // v1.0.5
var upload = multer(); // for parsing multipart/form-data
const errors = require('./../config/errorsCode.js');

router.post('/add', upload.array(), function(req, res) {

    db.oneOrNone('SELECT * FROM cancelations WHERE name=${name} AND company_id=${id} AND status=${true}',{
        id: req.body.company_id,
        name: functions.firstToUpper(req.body.name.trim().toLowerCase()),
        true: true,
    }).then(data => {
        if (data != null) {
            functions.returnErrorData(res, errors.err401, 'O cancelamento já existe');
            return;
        } else {
            db.none('INSERT INTO cancelations (name, created_at, updated_at, company_id, form_id_mautic) VALUES (${name}, ${date}, ${date}, ${company_id}, ${form_id_mautic})',{
                name: functions.firstToUpper(req.body.name.trim().toLowerCase()),
                company_id: req.body.company_id,
                date: functions.date(),
                form_id_mautic: req.body.form_id_mautic,
            });
            functions.insertAudit(req.body.user_id, "Cancelamentos", "registro", "Cancelamento registrado", req);
            functions.returnSuccessData(res, "Cancelamento registrado");
        }
    }).catch(error => {
        functions.errorBD(res, error, req.body.user_id, "Cancelamentos", "registro", req);
        return;
    });
});

router.put('/update/:id', upload.array(), function(req, res) {

    db.oneOrNone('SELECT * FROM cancelations WHERE name=${name} AND company_id=${id} AND status=${true}',{
        id: req.body.company_id,
        name: functions.firstToUpper(req.body.name.trim().toLowerCase()),
        true: true,
    }).then(data => {
        if (data != null) {
            if (data.id == req.params.id) {
                updatecancelations();
            } else {
                functions.returnErrorData(res, errors.err401, 'O cancelamento já existe');
                return;
            }
        } else {
            updatecancelations();
        }
    }).catch(error => {
        functions.errorBD(res, error, req.body.user_id, "Cancelamentos", "atualização", req);
        return;
    });

    function updatecancelations () {
        db.none('UPDATE cancelations SET name=${name}, updated_at=${date}, company_id=${company_id}, form_id_mautic=${form_id_mautic} WHERE id=${id}',{
            id: req.params.id,
            name: functions.firstToUpper(req.body.name.trim().toLowerCase()),
            company_id: req.body.company_id,
            date: functions.date(),
            form_id_mautic: req.body.form_id_mautic,
        });
        functions.insertAudit(req.body.user_id, "Cancelamentos", "atualização", "Cancelamento atualizado", req);
        functions.returnSuccessData(res, "Cancelamento atualizado");
    }
});

router.get('/view/:id/:user_id', upload.array(), function(req, res) {
    
    db.oneOrNone('SELECT * FROM cancelations WHERE id=${id} AND status=${true}',{
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
        functions.errorBD(res, error, req.params.user_id, "Cancelamentos", "detalhe", req);
        return;
    });
});

router.get('/all/:id/:user_id', upload.array(), function(req, res) {
    
    db.manyOrNone('SELECT * FROM cancelations WHERE company_id=${id} AND status=${true}',{
        id: req.params.id,
        true: true,
    }).then(data => {
        if(data.length>0) {
            functions.returnSuccessData(res, data);
        } else {
            return functions.returnErrorData(res, errors.err404, "Não há cancelamentos para esta organização");
        }
    }).catch(error => {
        functions.errorBD(res, error, req.params.user_id, "Cancelamentos", "listar", req);
        return;
    });
});

router.delete('/delete/:id/:user_id', upload.array(), function(req, res) {
    
    db.oneOrNone('SELECT * FROM cancelations WHERE id=${id}',{
        id: req.params.id,
    }).then(data => {
        if (data != null) {
            db.none("UPDATE cancelations SET status=${false} WHERE id=${id}", {
                id: req.params.id,
                false: false,
            });
            functions.insertAudit(req.params.user_id, "Cancelamentos", "eliminar", "Cancelamento removido", req);
            functions.returnSuccessData(res, "Cancelamento removido");
        } else {
            functions.returnErrorData(res, errors.err404, 'O cancelamentos não existe');
            return;
        }
    }).catch(error => {
        functions.errorBD(res, error, req.params.user_id, "Cancelamentos", "eliminar", req);
        return;
    });
});

module.exports = router;