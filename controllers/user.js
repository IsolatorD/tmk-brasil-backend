var express = require('express');
var router = express.Router();
var functions = require('./../config/helperFunctions.js');
var db = require('./../config/db.js').db;
var bcrypt = require('bcrypt-nodejs');
var multer = require('multer'); // v1.0.5
var upload = multer(); // for parsing multipart/form-data
var errors = require('./../config/errorsCode.js');

router.post('/add', upload.array(), function(req, res) {

    db.oneOrNone('SELECT * FROM users WHERE email = ${email} AND status = ${true}', {
        email:req.body.email.trim().toLowerCase(),
        true: true
    }).then(data => {
        if (data != null) {
            functions.returnErrorData(res, errors.err401, 'Email já cadastrado');
            return;
        } else {
            var nombres = req.body.first_name.trim().split(' ');
            var apellidos = req.body.last_name.trim().split(' ');

            for (let i=0; i < nombres.length; i++) {
                nombres[i] = functions.firstToUpper(nombres[i].toLowerCase());
            }

            for (let i=0; i < apellidos.length; i++) {
                apellidos[i] = functions.firstToUpper(apellidos[i].toLowerCase());
            }

            db.none("INSERT INTO users (first_name, last_name, email, encrypted_password, reset_password_sent_at, current_sign_in_at, last_sign_in_at, created_at, updated_at, role_id, monthly_goals, estatus, status) VALUES (${first_name}, ${last_name}, ${email}, ${password}, ${nulo}, ${nulo}, ${nulo}, ${date}, ${date}, ${role_id}, ${monthly_goals}, ${estatus}, ${status})", {
                first_name: nombres.join(' '),
                last_name: apellidos.join(' '),
                email: req.body.email.trim().toLowerCase(),
                password: bcrypt.hashSync(req.body.password.trim()),
                nulo: null,
                date: functions.date(),
                role_id: req.body.role_id,
                monthly_goals: req.body.monthly_goals,
                estatus: true,
                status: true
            });
            functions.insertAudit(req.body.user_id, "Usuário", "registro", "Usuário registrado", req);
            functions.returnSuccessData(res, "Usuário registrado");
        }
    }).catch(error => {
        functions.errorBD(res, error, req.body.user_id, "Usuário", "registro", req);
        return;
    });
});

router.put('/update/:id', upload.array(), function(req, res) {
    
    db.oneOrNone("SELECT * FROM users WHERE email = ${email} AND status = ${true}", {
        email:req.body.email.trim().toLowerCase(),
        true: true,
    }).then(data => {
        if (data != null) {
            if(data.id == req.params.id) {
                updateUser();
            } else {
                functions.returnErrorData(res, errors.err401, 'Já existe um usuário com este e-mail');
                return;
            }
        } else {
            updateUser();
        }
    }).catch(error => {
        functions.errorBD(res, error, req.body.user_id, "Usuário", "atualização", req);
        return;
    });

    function updateUser () {
        var nombres = req.body.first_name.trim().split(' ');
        var apellidos = req.body.last_name.trim().split(' ');

        for (let i=0; i < nombres.length; i++) {
            nombres[i] = functions.firstToUpper(nombres[i].toLowerCase());
        }

        for (let i=0; i < apellidos.length; i++) {
            apellidos[i] = functions.firstToUpper(apellidos[i].toLowerCase());
        }

        db.none("UPDATE users SET first_name=${first_name}, last_name=${last_name}, email=${email}, updated_at=${date}, role_id=${role_id}, monthly_goals=${monthly_goals}, estatus=${estatus} WHERE id=${id_user}", {
            first_name: nombres.join(' '),
            last_name: apellidos.join(' '),
            email: req.body.email.trim().toLowerCase(),
            //password: bcrypt.hashSync(req.body.password.trim()),
            date: functions.date(),
            role_id: req.body.role_id,
            id_user: req.params.id,
            monthly_goals: req.body.monthly_goals,
            estatus: req.body.estatus === "true" ? true : false
        });
        functions.insertAudit(req.body.user_id, "Usuário", "atualização", "Usuário atualizado", req);
        functions.returnSuccessData(res, "Usuário atualizado");
    }
});

router.get('/view/:id/:user_id', upload.array(), function(req, res) {
    
    db.oneOrNone("SELECT u.*, r.id AS role_id, r.name AS role_name FROM users u, role r WHERE u.id=${id} AND u.status=${true} AND r.status=${true} AND u.role_id=r.id ", {
        id: req.params.id,
        true: true,
    }).then(data => {
        if (data != null) {
            functions.returnSuccessData(res, data);
        } else {
            functions.returnErrorData(res, errors.err404, 'Usuário não existe');
            return;
        }
    }).catch(error => {
        functions.errorBD(res, error, req.params.user_id, "Usuário", "detalhe", req);
        return;
    });
});

router.get('/all/:user_id', upload.array(), async (req, res) => {
 
    db.manyOrNone("SELECT u.id, u.first_name, u.last_name, u.email, u.monthly_goals, u.estatus, r.id AS role_id, r.name AS role_name FROM users u, role r WHERE u.status=${true} AND r.status=${true} AND u.role_id=r.id ORDER BY u.id ASC", {
        true: true,
    }).then(async data => {
        if (data != null && data.length > 0) {
            for (let i = 0; i < data.length; i++) {
                let assigned = await db.manyOrNone("SELECT * FROM clients_has_users WHERE user_id=${user_id}", {
                    user_id: data[i].id,
                });
                
                data[i].assigned=assigned.length;
            }
            
            functions.returnSuccessData(res, data);

        } else {
            functions.returnErrorData(res, errors.err404, 'Nenhum dado de Usuários');
            return;
        }
    }).catch(error => {
        functions.errorBD(res, error, req.params.user_id, "Usuário", "listar", req);
        return;
    });
});

router.get('/all_operators/:user_id', upload.array(), async (req, res) => {
 
    db.manyOrNone("SELECT u.id, u.first_name, u.last_name, u.email, u.monthly_goals, u.estatus, r.id AS role_id, r.name AS role_name FROM users u, role r WHERE u.status=${true} AND r.status=${true} AND u.role_id=r.id AND u.role_id=${role} AND u.id>${id} ORDER BY u.id ASC", {
        true: true,
        id: 0,
        role: 3,
    }).then(async data => {
        if (data != null && data.length > 0) {
            for (let i = 0; i < data.length; i++) {
                let assigned = await db.manyOrNone("SELECT * FROM clients_has_users WHERE user_id=${user_id}", {
                    user_id: data[i].id,
                });
                
                data[i].assigned=assigned.length;
            }
            
            functions.returnSuccessData(res, data);

        } else {
            functions.returnErrorData(res, errors.err404, 'Nenhum dado de Usuários');
            return;
        }
    }).catch(error => {
        functions.errorBD(res, error, req.params.user_id, "Usuário", "listar", req);
        return;
    });
});

router.delete('/delete/:id/:user_id', upload.array(), function(req, res) {

    db.oneOrNone('SELECT * FROM users WHERE id = ${id}', {id:req.params.id})
    .then(data => {
        if (data != null) {
            db.none("UPDATE users SET status=${false} WHERE id = ${id}", {
                id: req.params.id,
                false: false,
            });
            functions.insertAudit(req.params.user_id, "Usuário", "eliminar", "Usuário excluído", req);
            functions.returnSuccessData(res, "Usuário excluído");
        } else {
            functions.returnErrorData(res, errors.err404, 'Usuário não existe');
            return;
        }
    }).catch(error =>{
        functions.errorBD(res, error, req.params.user_id, "Usuário", "eliminar", req);
        return;
    });
});

router.put('/update_pass', upload.array(), function(req, res) {
    
    db.none("UPDATE users SET encrypted_password=${password}, updated_at=${date} WHERE id=${id_user}", {
        password: bcrypt.hashSync(req.body.password.trim()),
        date: functions.date(),
        id_user: req.body.user_id,
    });
    functions.insertAudit(req.body.user_id, "Usuário", "atualização", "Senha atualizada", req);
    functions.returnSuccessData(res, "Senha atualizada");
});

module.exports = router;