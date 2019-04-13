const express = require('express');
const router = express.Router();
const functions = require('./../config/helperFunctions.js');
const db = require('./../config/db.js').db;
const multer = require('multer'); // v1.0.5
const errors = require('./../config/errorsCode.js');
const fs = require('fs');
var nombreArchivo='default.png';
var preRuta='public/img/companies/';

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (file) {
            cb(null, `./public/img/companies`);
        }
    },
    filename: (req, file, cb) => {
        if (file) {
            let extension=null;
            if (file.mimetype == 'image/png') {
                extension = 'png';
            } else if (file.mimetype == 'image/jpg' || file.mimetype == 'image/jpeg') {
                extension = 'jpg';
            }

            if (extension !== null) {
                nombreArchivo = `${Date.now()}.${extension}`;
                cb(null, nombreArchivo);
            }
        }
    }
});
const upload = multer({storage: storage}).single('logo'); // for parsing multipart/form-data

router.post('/add', function(req, res) {
    upload(req, res, function (err) {
        if (err) {
            functions.returnErrorData(res, errors.err503, 'Erro ao carregar a imagem, tente novamente');
            return;
        }
        
        db.oneOrNone('SELECT * FROM companies WHERE name = ${name} AND status = ${true}',{
            name:req.body.name.trim(),
            true:true,
        }).then(data => {
            if (data != null) {
                if(nombreArchivo!='default.png') {
                    fs.unlink(`./${preRuta}${nombreArchivo}`,function(err){
                        if(err) {
                            console.log('file not deleted');
                        } else {
                            console.log('file deleted successfully');
                        }
                    });
                }
                functions.returnErrorData(res, errors.err401, 'Organização já registrada');
                return;
            } else {
                let api_key = generateApiKey();

                db.none("INSERT INTO companies (name, logo, created_at, updated_at, url_mautic, api_key) VALUES (${name}, ${logo}, ${date}, ${date}, ${url_mautic}, ${api_key})", {
                    name: req.body.name.trim(),
                    logo: `${preRuta}${nombreArchivo}`,
                    date: functions.date(),
                    url_mautic: req.body.url_mautic.trim(),
                    api_key: api_key,
                });
                
                functions.insertAudit(req.body.user_id, "Organização", "registro", "Organização registrada", req);
                functions.returnSuccessData(res, "Organização registrada");
            }
        }).catch(error => {
            functions.errorBD(res, error, req.body.user_id, "Organização", "registro", req);
            return;
        });
    });
});

router.put('/update/:id', function(req, res) {
    upload(req, res, function (err) {
        if (err) {
            functions.returnErrorData(res, errors.err503, 'Erro ao carregar a imagem, tente novamente');
            return;
        }

        db.oneOrNone('SELECT * FROM companies WHERE name = ${name} AND status = ${true}',{
            name:req.body.name.trim(),
            true:true,
        }).then(data => {
            if (data != null) {
                if(data.id == req.params.id){
                    updateCompany();
                } else {
                    if(nombreArchivo!='default.png') {
                        fs.unlink(`./${preRuta}${nombreArchivo}`,function(err){
                            if(err) {
                                console.log('file not deleted');
                            } else {
                                console.log('file deleted successfully');
                            }
                        });
                    }
                    functions.returnErrorData(res, errors.err401, 'Já existe uma organização com este nome');
                    return;
                }
            } else {
                updateCompany();
            }
        }).catch(error => {
            functions.errorBD(res, error, req.body.user_id, "Organização", "atualização", req);
            return;
        });

        function updateCompany () {
            db.one("SELECT * FROM companies WHERE id = ${id}", {
                id: req.params.id,
            }).then(data => {
                let ruta_logo=`${preRuta}${nombreArchivo}`;
                if(req.file) {
                    console.log('FILE');
                    if(data.logo != null) {
                        if(data.logo!='public/img/companies/default.png') {
                            fs.unlink(`./${data.logo}`,function(err){
                                if(err) {
                                    console.log('file not deleted');
                                } else {
                                    console.log('file deleted successfully');
                                }
                            });
                        }
                    } else {
                        console.log('file not exist');
                    }
                } else {
                    console.log('NO FILE');
                    if(data.logo != null) {
                        ruta_logo = data.logo;
                    }
                }

                if(req.body.update_api_key=="true") {
                    let api_key = generateApiKey();
                    db.none("UPDATE companies SET name=${name}, logo=${logo}, updated_at=${date}, url_mautic=${url_mautic}, api_key=${api_key} WHERE id=${id}", {
                        id: req.params.id,
                        name: req.body.name.trim(),
                        logo: ruta_logo,
                        date: functions.date(),
                        url_mautic: req.body.url_mautic.trim(),
                        api_key,
                    });
                } else {
                    db.none("UPDATE companies SET name=${name}, logo=${logo}, updated_at=${date}, url_mautic=${url_mautic} WHERE id=${id}", {
                        id: req.params.id,
                        name: req.body.name.trim(),
                        logo: ruta_logo,
                        date: functions.date(),
                        url_mautic: req.body.url_mautic.trim(),
                    });
                }

                functions.insertAudit(req.body.user_id, "Organização", "atualização", "Organização atualizada", req);
                functions.returnSuccessData(res, "Organização atualizada");

            }).catch(error => {
                functions.errorBD(res, error, req.body.user_id, "Organização", "atualização", req);
                return;
            });
        }
    });
});

router.get('/all/:user_id', function(req, res) {
    upload(req, res, function (err) {
        
        db.manyOrNone("SELECT * FROM companies WHERE status = ${true} ORDER BY id ASC", {
            true: true,
        }).then(data => {
            if (data != null && data.length > 0) {
                functions.returnSuccessData(res, data);
            } else {
                functions.returnErrorData(res, errors.err404, 'Não há dados');
                return;
            }
        }).catch(error => {
            functions.errorBD(res, error, req.params.user_id, "Organização", "listar", req);
            return;
        });
    });
});

router.get('/view/:id/:user_id', function(req, res) {
    upload(req, res, function (err) {

        db.oneOrNone("SELECT * FROM companies WHERE id = ${id} AND status = ${true}", {
            id: req.params.id,
            true: true
        }).then(data => {
            if (data != null) {
                functions.returnSuccessData(res, data);
            } else {
                functions.returnErrorData(res, errors.err404, 'Organização não existe');
                return;
            }
        }).catch(error => {
            functions.errorBD(res, error, req.params.user_id, "Organização", "detalhe", req);
            return;
        });
    });
});

router.delete('/delete/:id/:user_id', function(req, res) {
    upload(req, res, function (err) {

        db.oneOrNone('SELECT * FROM companies WHERE id = ${id}', {id:req.params.id})
        .then(data => {
            if (data != null) {
                db.none("UPDATE companies SET status=${false} WHERE id = ${id}", {
                    id: req.params.id,
                    false: false,
                });
                functions.insertAudit(req.params.user_id, "Organização", "eliminar", "Organização excluída", req);
                functions.returnSuccessData(res, "Organização excluída");
            } else {
                functions.returnErrorData(res, errors.err404, 'Organização não existe');
                return;
            }
        }).catch(error =>{
            functions.errorBD(res, error, req.params.user_id, "Organização", "eliminar", req);
            return;
        });
    });
});

function generateApiKey () {
    let api_key = "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890-!$%&?*+._";
    let len = api_key.length;
    var cadena='';
    
    for (let i = 0; i < 30; i++) {    
        let random = Math.floor(Math.random()*len);
        let caracter = api_key.substr(random, 1);
        cadena=cadena+caracter;
    }

    return cadena;
}

module.exports = router;