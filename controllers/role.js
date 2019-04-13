const express = require('express');
const router = express.Router();
const functions = require('./../config/helperFunctions.js');
const db = require('./../config/db.js').db;
var multer = require('multer'); // v1.0.5
var upload = multer(); // for parsing multipart/form-data
const errors = require('./../config/errorsCode.js');

router.post('/add', upload.array(), function(req, res) {
    
    db.oneOrNone('SELECT * FROM role WHERE name = ${name} AND status = ${true}',{
        name: functions.firstToUpper(req.body.name.trim().toLowerCase()),
        true: true,
    }).then(data => {
        if (data != null) {
            functions.returnErrorData(res, errors.err401, 'O papel já existe');
            return;
        } else {
            db.oneOrNone("INSERT INTO role (name, created_at, updated_at) VALUES (${name}, ${date}, ${date}) RETURNING id", {
                name: functions.firstToUpper(req.body.name.trim().toLowerCase()),
                date: functions.date(),
            }).then(data2 => {
                if (data2 != null) {
                    for (const iterator of req.body.permisos) {
                        db.none("INSERT INTO role_has_permission (role_id, permission_id) VALUES (${role_id}, ${permission_id})", {
                            role_id: data2.id,
                            permission_id: iterator,
                        });
                    }
                    functions.insertAudit(req.body.user_id, "Papéis", "registro", "Papel registrado", req);
                    functions.returnSuccessData(res, "Papel registrado");
                } else {
                    functions.insertAudit(req.body.user_id, "Papéis", "registro", "Função criada, as permissões não puderam ser associadas", req);
                    functions.returnErrorData(res, errors.err401, 'Função criada, as permissões não puderam ser associadas');
                    return;
                }
            }).catch(error => {
                functions.errorBD(res, error, req.body.user_id, "Papéis", "registro", req);
                return;
            });
        }
    }).catch(error => {
        functions.errorBD(res, error, req.body.user_id, "Papéis", "registro", req);
        return;
    });
});

router.put('/update/:id', upload.array(), function(req, res) {
    
    db.oneOrNone('SELECT * FROM role WHERE name = ${name} AND status = ${true}',{
        name: functions.firstToUpper(req.body.name.trim().toLowerCase()),
        true: true,
    }).then(data => {
        if (data != null) {
            if (req.params.id == data.id) {
                updateRole();
            } else {
                functions.returnErrorData(res, errors.err401, 'O papel já existe');
                return;
            }
        } else {
            updateRole();
        }
    }).catch(error => {
        functions.errorBD(res, error, req.body.user_id, "Papéis", "atualização", req);
        return;
    });

    function updateRole () {
        db.oneOrNone("UPDATE role SET name=${name}, updated_at=${date} WHERE id=${id} RETURNING id", {
            name: functions.firstToUpper(req.body.name.trim().toLowerCase()),
            date: functions.date(),
            id: req.params.id,
        }).then(data2 => {
            if (data2 != null) {
                db.none("DELETE FROM role_has_permission WHERE role_id=${id}", {id: req.params.id});
                for (const iterator of req.body.permisos) {
                    db.none("INSERT INTO role_has_permission (role_id, permission_id) VALUES (${role_id}, ${permission_id})", {
                        role_id: data2.id,
                        permission_id: iterator,
                    });
                }
                functions.insertAudit(req.body.user_id, "Papéis", "atualização", "Função atualizada", req);
                functions.returnSuccessData(res, "Função atualizada");
            } else {
                functions.insertAudit(req.body.user_id, "Papéis", "atualização", "Função atualizada, as permissões não puderam ser associadas", req);
                functions.returnErrorData(res, errors.err401, 'Função atualizada, as permissões não puderam ser associadas');
                return;
            }
        }).catch(error => {
            functions.errorBD(res, error, req.body.user_id, "Papéis", "atualização", req);
            return;
        });
    }
});

router.get('/view/:id/:user_id', upload.array(), function(req, res) {
    
    db.oneOrNone('SELECT id, name, updated_at FROM role WHERE status=${true} AND id=${id}',{
        id: req.params.id,
        true:true,
    }).then(data => {
        if (data != null) {
            db.manyOrNone('SELECT p.id, p.name, p._controller, p._method, p.updated_at FROM permission p, role_has_permission rp WHERE p.status=${true} AND rp.role_id=${id} AND rp.permission_id=p.id',{
                id: req.params.id,
                true:true,
            }).then(data2 => {
                var array;
                if (data2 != null && data2.length > 0) {
                    array = {role: data, permission: data2};
                } else {
                    array = {role: data, permission: null};
                }
                functions.returnSuccessData(res, array);
            }).catch(error => {
                functions.errorBD(res, error, req.params.user_id, "Papéis", "detalhe", req);
                return;
            });
        } else {
            functions.returnErrorData(res, errors.err404, 'Não há dados');
            return;
        }
    }).catch(error => {
        functions.errorBD(res, error, req.params.user_id, "Papéis", "detalhe", req);
        return;
    });
});

router.delete('/delete/:id/:user_id', upload.array(), function(req, res) {
    
    db.oneOrNone('SELECT * FROM role WHERE status=${true} AND id=${id}',{
        id: req.params.id,
        true:true,
    }).then(data => {
        if (data != null) {
            db.none('UPDATE role SET status=${false} WHERE id=${id}',{
                id: req.params.id,
                false: false,
            });
            functions.insertAudit(req.params.user_id, "Usuario", "eliminar", "Função removida", req);
            functions.returnSuccessData(res, "Função removida");
        } else {
            functions.returnErrorData(res, errors.err404, 'O papel não existe');
            return;
        }
    }).catch(error => {
        functions.errorBD(res, error, req.params.user_id, "Papéis", "eliminar", req);
        return;
    });
});

router.get('/all/:user_id', upload.array(), function(req, res) {
    
    db.manyOrNone('SELECT id, name FROM role WHERE status = ${true} AND id != ${superAdmin}',{
        true:true,
        superAdmin: 1,
    }).then(data => {
        if (data != null && data.length > 0) {
            functions.returnSuccessData(res, data);
        } else {
            functions.returnErrorData(res, errors.err404, 'Não há dados');
            return;
        }
    }).catch(error => {
        functions.errorBD(res, error, req.params.user_id, "Papéis", "listar", req);
        return;
    });
});

module.exports = router;