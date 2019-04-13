const express = require('express');
const router = express.Router();
const functions = require('./../config/helperFunctions.js');
const db = require('./../config/db.js').db;
var multer = require('multer'); // v1.0.5
var upload = multer(); // for parsing multipart/form-data
const errors = require('./../config/errorsCode.js');

router.post('/all_donations/:id', upload.array(), function(req, res) {

    // TYPE
    var mensual = req.body.frequency[0] ? req.body.frequency[0].trim() : ''; // Mensal
    var puntual = req.body.frequency[1] ? req.body.frequency[1].trim() : ''; // Pontual

    // METHOD 
    var tarjeta = req.body.payment_type[0] ? req.body.payment_type[0].trim() : ''; // Cartão
    var domiciliacionBancaria = req.body.payment_type[1] ? req.body.payment_type[1].trim() : ''; // Conta

    // PERSON TYPE
    var personaFisica = req.body.person_type[0] ? req.body.person_type[0].trim() : ''; // Pessoa Fisica
    var personaJuridica = req.body.person_type[1] ? req.body.person_type[1].trim() : ''; // Pessoa Juridica
     
    db.manyOrNone('SELECT c.id AS client_id, c.email, c.first_name, c.last_name, c.sex, c.phone, c.birth_date, c.cpf, c.cep, c.state, c.city, c.urbanization, c.address, c.complement, c.number, c.type, d.id AS donation_id, d.amount, d.created_at, d.type AS donation_type, d.codcad, d.payment_date, d.method, d.person_type, d.identification_type, d.identification, d.card_type, d.card_number, d.expired_month, d.expired_year, d.account_type, d.bank, d.agency, d.account_number, d.monthly_year_payment, u.email AS user_email, u.first_name AS user_first_name, u.last_name AS user_last_name FROM clients c, donations d, users u WHERE c.status=${true} AND d.client_id=c.id AND d.company_id=${id} AND d.export=${false} AND d.type IN (${mensual}, ${puntual}) AND d.method IN (${tarjeta}, ${domiciliacionBancaria}) AND d.person_type IN (${personaFisica}, ${personaJuridica}) AND d.canceled=${false} AND u.id=d.user_id AND u.status=${true} ORDER BY d.id ASC', {
        id: req.params.id,
        true: true,
        mensual,
        puntual,
        tarjeta,
        domiciliacionBancaria,
        personaFisica,
        personaJuridica,
        false: false,
    }).then(clients => {
        if (clients != null && clients.length > 0) {
            
            for (let i = 0; i < clients.length; i++) {
                clients[i].card_type = clients[i].card_type ? functions.decrypt(clients[i].card_type) : '';
                clients[i].card_number = clients[i].card_number ? functions.decrypt(clients[i].card_number) : '';
                clients[i].expired_month = clients[i].expired_month ? functions.decrypt(clients[i].expired_month) : '';
                clients[i].expired_year = clients[i].expired_year ? functions.decrypt(clients[i].expired_year) : '';
                clients[i].account_type = clients[i].account_type ? functions.decrypt(clients[i].account_type) : '';
                clients[i].bank = clients[i].bank ? functions.decrypt(clients[i].bank) : '';
                clients[i].agency = clients[i].agency ? functions.decrypt(clients[i].agency) : '';
                clients[i].account_number = clients[i].account_number ? functions.decrypt(clients[i].account_number) : '';                
            }

            functions.returnSuccessData(res, clients);
        } else {
            functions.returnErrorData(res, errors.err404, 'Não há doadores com doações');
            return;
        }
    }).catch(error =>{
        return functions.errorBD(res, error, req.body.user_id, "Exportações", "marcar as exportações", req);
    });
});

router.put('/mark_exportation', upload.array(), function(req, res) {
    var date = functions.date();
    var length = req.body.ids.length; // ids de donaciones

    db.oneOrNone("SELECT * FROM companies WHERE id=${id} AND status=${true}", {
        id: req.body.company_id,
        true: true,
    }).then(company => {
        if(company!=null) {
            for (var i=0; i < length; i++) {
                db.none("UPDATE donations SET export=${true}, export_date=${date} WHERE id=${id}", {
                    true: true,
                    date: date,
                    id: req.body.ids[i],
                });
            }

            let types = company.name+", "+req.body.types.join(', '); // string que contiene todos los filtros y la compañia

            db.oneOrNone("INSERT INTO exportation (created_at, type, length, user_id) VALUES (${date}, ${type}, ${length}, ${user_id}) RETURNING *", {
                date: date,
                type: types,
                length: length+" resultados",
                user_id: req.body.user_id,
            }).then(data => {
                if (data != null) {
                    
                    functions.insertAudit(req.body.user_id, "Exportações", "marcar as exportações", `Exportação registrada. Data:${date}. Id:${data.id}`, req);
                    
                    for (var i=0; i < length; i++) {
                        db.oneOrNone("SELECT client_id FROM donations WHERE id=${id}", {
                            id: req.body.ids[i],
                        }).then(res => {
                            req.body.client_id=res.client_id;
                            functions.insertHistoric(req, "Registro", `Exportação registrada. Data:${date}. Id:${data.id}`, 0, true, 0, functions.origin_data);
                        }).catch(error => {
                            return functions.errorBD(res, error, req.body.user_id, "Exportações", "marcar as exportações", req);
                        });
                    }
                    functions.returnSuccessData(res, "História registrada");
                } else {
                    functions.returnErrorData(res, errors.err503, 'Não foi possível registrar o histórico');
                    return;
                }
            }).catch(error => {
                return functions.errorBD(res, error, req.body.user_id, "Exportações", "marcar as exportações", req);
            });
        } else {
            functions.returnErrorData(res, errors.err503, 'A associação não existe');
            return;
        }
    }).catch(error => {
        return functions.errorBD(res, error, req.body.user_id, "Exportações", "marcar as exportações", req);
    });
});

router.get('/get_exportation/:user_id', upload.array(), function(req, res) { // historial

    db.manyOrNone("SELECT e.*, u.first_name, u.last_name, u.email FROM exportation e, users u WHERE e.user_id=u.id AND u.status=${true} ORDER BY e.created_at DESC", {
        true: true,
    }).then(data => {
        if (data != null && data.length > 0) {
            functions.returnSuccessData(res, data);
        } else {
            functions.returnErrorData(res, errors.err404, 'Não há histórico de exportações');
            return;
        }
    }).catch(error => {
        return functions.errorBD(res, error, req.params.user_id, "Exportações", "Obter exportações", req);
    });
});

router.post('/get_export_donation', upload.array(), function(req, res) { // obtener exportacion viejas
    
    db.manyOrNone('SELECT c.id AS client_id, c.email, c.first_name, c.last_name, c.sex, c.phone, c.birth_date, c.cpf, c.cep, c.state, c.city, c.urbanization, c.address, c.complement, c.number, c.type, d.id AS donation_id, d.amount, d.created_at, d.type AS donation_type, d.codcad, d.payment_date, d.method, d.person_type, d.identification_type, d.identification, d.card_type, d.card_number, d.expired_month, d.expired_year, d.account_type, d.bank, d.agency, d.account_number, d.monthly_year_payment, u.email AS user_email, u.first_name AS user_first_name, u.last_name AS user_last_name FROM clients c, donations d, users u WHERE d.client_id=c.id AND c.status=${true} AND d.canceled=${false} AND export_date=${export_date} AND u.id=d.user_id AND u.status=${true} ORDER BY d.id ASC', {
        true: true,
        export_date: req.body.export_date,
        false: false,
    }).then(clients => {
        if (clients != null && clients.length > 0) {
            
            for (let i = 0; i < clients.length; i++) {
                clients[i].card_type = clients[i].card_type ? functions.decrypt(clients[i].card_type) : '';
                clients[i].card_number = clients[i].card_number ? functions.decrypt(clients[i].card_number) : '';
                clients[i].expired_month = clients[i].expired_month ? functions.decrypt(clients[i].expired_month) : '';
                clients[i].expired_year = clients[i].expired_year ? functions.decrypt(clients[i].expired_year) : '';
                clients[i].account_type = clients[i].account_type ? functions.decrypt(clients[i].account_type) : '';
                clients[i].bank = clients[i].bank ? functions.decrypt(clients[i].bank) : '';
                clients[i].agency = clients[i].agency ? functions.decrypt(clients[i].agency) : '';
                clients[i].account_number = clients[i].account_number ? functions.decrypt(clients[i].account_number) : '';                
            }

            functions.returnSuccessData(res, clients);
            
        } else {
            functions.returnErrorData(res, errors.err404, 'Não há doadores com doações');
            return;
        }
    }).catch(error =>{
        return functions.errorBD(res, error, req.body.user_id, "Exportações", "Obter doações exportadas", req);
    });
});

router.get('/recusas/:operator_id/:company_id/:call_status_id/:code/:first_date/:last_date/:user_id', upload.array(), async function(req, res) { // obtener exportacion viejas

    let {
        operator_id,
        company_id,
        user_id,
        code,
        first_date,
        last_date,
        call_status_id,
    } = req.params;

    if (code == 'customized') {
        first_date = `${first_date} 00:00:00`;
        last_date = `${last_date} 23:59:59`;
    } else {
        first_date = functions.filterDateToQuery(code);
        last_date = functions.date();
    }

    try {
        let contactResult = await db.manyOrNone('SELECT c.id AS client_id, c.email, c.first_name, c.last_name, c.sex, c.phone, c.birth_date, c.cpf, c.cep, c.state, c.city, c.urbanization, c.address, c.complement, c.number, c.type, h.description, h.date FROM clients c, historic h, users u, call_status cs WHERE h.client_id=c.id AND c.status=${true} AND u.id=h.user_id AND u.status=${true} AND h.event=${event} AND h.company_id=${company_id} AND h.user_id=${operator_id} AND h.reference_id=${call_status_id} AND h.reference_id=cs.id AND cs.status=${true} AND h.date BETWEEN ${first_date} AND ${last_date} ORDER BY h.id ASC', {
            true: true,
            event: 'Resultado do contato',
            first_date,
            last_date,
            operator_id,
            company_id,
            call_status_id,
        });

        if (contactResult!=null && contactResult.length > 0) {
            functions.returnSuccessData(res, contactResult);
        } else {
            return functions.returnErrorData(res, errors.err404, 'Não há doadores com resultado do contato negativos');
        }
    } catch (error) {
        return functions.errorBD(res, error, user_id, "Exportações", "Obter doações exportadas", req);
    }
});

module.exports = router;