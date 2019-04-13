const express = require('express');
const router = express.Router();
const functions = require('./../config/helperFunctions.js');
const db = require('./../config/db.js').db;
var multer = require('multer'); // v1.0.5
var upload = multer(); // for parsing multipart/form-data
const errors = require('./../config/errorsCode.js');

router.post('/add', upload.array(), function(req, res) {

    db.oneOrNone('SELECT * FROM campains WHERE name=${name} AND company_id=${id} AND status=${true}',{
        id: req.body.company_id,
        name: functions.firstToUpper(req.body.name.trim().toLowerCase()),
        true: true,
    }).then(data => {
        if (data != null) {
            functions.returnErrorData(res, errors.err401, 'A campanha já existe');
            return;
        } else {
            if(new Date(req.body.start_date).getTime() > new Date(req.body.final_date).getTime()) {
                functions.returnErrorData(res, errors.err401, 'A data final deve ser maior que a inicial');
                return;
            }
            
            db.none('INSERT INTO campains (name, description, start_date, final_date, url, company_id, created_at, updated_at) VALUES (${name}, ${description}, ${start_date}, ${final_date}, ${url}, ${company_id}, ${date}, ${date})',{
                name: functions.firstToUpper(req.body.name.trim().toLowerCase()),
                description: req.body.description.trim(),
                start_date: `${req.body.start_date} 00:00:00`,
                final_date: `${req.body.final_date} 12:59:59`,
                url: req.body.url.trim(),
                company_id: req.body.company_id,
                date: functions.date(),
            });
            functions.insertAudit(req.body.user_id, "Campanha", "registro", "Campanha registrada", req);
            functions.returnSuccessData(res, "Campanha registrada");
        }
    }).catch(error => {
        functions.errorBD(res, error, req.body.user_id, "Campanha", "registro", req);
        return;
    });
});

router.put('/update/:id', upload.array(), function(req, res) {

    db.oneOrNone('SELECT * FROM campains WHERE name=${name} AND company_id=${id} AND status=${true}',{
        id: req.body.company_id,
        name: functions.firstToUpper(req.body.name.trim().toLowerCase()),
        true: true,
    }).then(data => {
        if (data != null) {
            if (data.id == req.params.id) {
                updateCampains();
            } else {
                functions.returnErrorData(res, errors.err401, 'A campanha já existe');
                return;
            }
        } else {
            updateCampains();
        }
    }).catch(error => {
        functions.errorBD(res, error, req.body.user_id, "Campanha", "atualização", req);
        return;
    });

    function updateCampains () {
        if (new Date(req.body.start_date).getTime() > new Date(req.body.final_date).getTime()) {
            functions.returnErrorData(res, errors.err401, 'A data final deve ser maior que a inicial');
            return;
        }
        
        db.none('UPDATE campains SET name=${name}, description=${description}, start_date=${start_date}, final_date=${final_date}, url=${url}, company_id=${company_id}, updated_at=${date} WHERE id=${id}',{
            id: req.params.id,
            name: functions.firstToUpper(req.body.name.trim().toLowerCase()),
            description: req.body.description.trim(),
            start_date: `${req.body.start_date} 00:00:00`,
            final_date: `${req.body.final_date} 12:59:59`,
            url: req.body.url.trim(),
            company_id: req.body.company_id,
            date: functions.date(),
        });
        functions.insertAudit(req.body.user_id, "Campanha", "atualização", "Campanha atualizada", req);
        functions.returnSuccessData(res, "Campanha atualizada");
    }
});

router.get('/view/:id/:user_id', upload.array(), function(req, res) {

    db.oneOrNone('SELECT * FROM campains WHERE id=${id} AND status=${true}',{
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
        functions.errorBD(res, error, req.params.user_id, "Campanha", "detalhe", req);
        return;
    });
});

router.get('/all/:company_id/:user_id', upload.array(), async (req, res) =>{

	let { company_id, user_id } = req.params;
	try {
		let c = await db.manyOrNone("SELECT * FROM campains WHERE company_id=${company_id} " +
			"AND status=${true}", {
			company_id,
			true: true
        });
        if (c.length>0) {
            functions.returnSuccessData(res, c);
        } else {
            return functions.returnErrorData(res, errors.err404, "Não há campanhas para esta associação");
        }
	} catch (error) {
		return functions.errorBD(res, error, user_id, "Campanha", "listar", req);
	}
});

router.delete('/delete/:id/:user_id', upload.array(), function(req, res) {

    db.oneOrNone('SELECT * FROM campains WHERE id=${id}',{
        id: req.params.id,
    }).then(data => {
        if (data != null) {
            db.none("UPDATE campains SET status=${false} WHERE id=${id}", {
                id: req.params.id,
                false: false,
            });
            functions.insertAudit(req.params.user_id, "Campanha", "eliminar", "Campanha removida", req);
            functions.returnSuccessData(res, "Campanha removida");
        } else {
            functions.returnErrorData(res, errors.err404, 'A campanha não existe');
            return;
        }
    }).catch(error => {
        functions.errorBD(res, error, req.params.user_id, "Campanha", "eliminar", req);
        return;
    });
});

module.exports = router;