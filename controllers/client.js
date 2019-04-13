const express = require('express');
const router = express.Router();
const functions = require('./../config/helperFunctions.js');
const db = require('./../config/db.js').db;
var multer = require('multer'); // v1.0.5
var upload = multer(); // for parsing multipart/form-data
const errors = require('./../config/errorsCode.js');

router.post('/add', upload.array(), async (req, res) => {

    let { email, first_name, last_name, sex, phone, company_id, birth_date, cpf, cep, state, city, 
        urbanization, address, complement, number, type, user_id } = req.body;
	try {
		if (!email) { functions.returnErrorData(res, errors.err401, 'Mail é obrigatório.'); return;}
		if (!first_name) { functions.returnErrorData(res, errors.err401, 'O nome é obrigatório.'); return;}
		if (!last_name) { functions.returnErrorData(res, errors.err401, 'O sobrenome é obrigatório.'); return;}
        if (!cpf) { functions.returnErrorData(res, errors.err401, 'O CPF é obrigatório.'); return;}
        if (!type) { functions.returnErrorData(res, errors.err401, 'O tipo de doador é obrigatório.'); return;}

        let lead = await db.oneOrNone("SELECT * FROM clients WHERE email=${email} AND status=${true}", {
			email: email.trim().toLowerCase(),
            true: true,
        });

        if (lead!=null) {
            functions.returnErrorData(res, errors.err401, 'Já existe um doador com este email.');
            return;
        } else {
            let nombres = first_name.trim().split(' ');
            let apellidos = last_name.trim().split(' ');

            for (let i=0; i < nombres.length; i++) {
                nombres[i] = functions.firstToUpper(nombres[i].toLowerCase());
            }

            for (let i=0; i < apellidos.length; i++) {
                apellidos[i] = functions.firstToUpper(apellidos[i].toLowerCase());
            }

            let client = await db.one("INSERT INTO clients (email, first_name, last_name, sex, " +
            "phone, created_at, updated_at, birth_date, cpf, cep, state, city, urbanization, "+
            "address, complement, number, type) VALUES (${email}, ${first_name}, ${last_name}, ${sex}, "+
            "${phone}, ${date}, ${date}, ${birth_date}, ${cpf}, ${cep}, ${state}, ${city}, ${urbanization}, "+
            "${address}, ${complement}, ${number}, ${type}) RETURNING *", {
                email: email.trim().toLowerCase(),
                first_name: nombres.join(' '),
                last_name: apellidos.join(' '),
                sex: sex ? sex : '',
                phone: String(phone).trim(),
                date: functions.date(),
                birth_date: birth_date ? birth_date : null,
                cpf: cpf ? String(cpf).trim() : '',
                cep: cep ? String(cep).trim() : '',
                state: state ? state.trim() : '',
                city: city ? city.trim() : '',
                urbanization: urbanization ? urbanization.trim() : '',
                address: address ? address.trim() : '',
                complement: complement ? complement.trim() : '',
                number: number ? String(number).trim() : '',
                type: type.trim(),
            });
            
            if (client!=null) {
                req.body.client_id=client.id;
                functions.insertAudit(user_id, "Doador", "registro", `Doador ${email.trim().toLowerCase()} registrado`, req);
                functions.insertHistoric(req, "Registro", "Registro de doador", 0, true, 0, functions.origin_data);

                let client_has_company = await db.oneOrNone("INSERT INTO clients_has_companies (client_id, company_id) VALUES (${client_id}, ${company_id}) RETURNING *", {
                    client_id: client.id,
                    company_id
                });

                if(client_has_company!=null) {
                    let companies = await db.manyOrNone("SELECT c.* FROM companies c LEFT JOIN clients_has_companies cc ON c.id=cc.company_id AND c.status=${true} WHERE cc.client_id=${client_id}", {
                        true: true,
                        client_id: client.id,
                    });

                    let firstCompany = await db.oneOrNone("SELECT c.id FROM clients_has_companies cc, companies c WHERE cc.client_id=${client_id} AND cc.company_id=c.id AND c.status=${true} ORDER BY cc.id ASC LIMIT 1", {
                        client_id: client.id,
                        true: true
                    });

                    functions.returnSuccessData(res, {sms: "Doador registrado", client: client, companies: companies, firstCompany: firstCompany.id});
                } else {
                    functions.returnSuccessData(res, "Doador registrado, não poderia estar relacionado à associação");
                }
            } else {
                functions.returnErrorData(res, errors.err503, "O doador não pôde ser registrado");
                return;
            }
        }
	} catch (error) {
		return functions.errorBD(res, error, user_id, "Doador", "registro", req);
    }
});

router.put('/update/:id', upload.array(), async (req, res) => {

    let { email, first_name, last_name, sex, phone, birth_date, cpf, cep, state, city, 
        urbanization, address, complement, number, type, user_id } = req.body;
    let client=null;
	try {
		if (!email) { functions.returnErrorData(res, errors.err401, 'Mail é obrigatório.'); return;}
		if (!first_name) { functions.returnErrorData(res, errors.err401, 'O nome é obrigatório.'); return;}
		if (!last_name) { functions.returnErrorData(res, errors.err401, 'O sobrenome é obrigatório.'); return;}
        if (!cpf) { functions.returnErrorData(res, errors.err401, 'O CPF é obrigatório.'); return;}
        if (!type) { functions.returnErrorData(res, errors.err401, 'O tipo de doador é obrigatório.'); return;}

        let lead = await db.oneOrNone("SELECT * FROM clients WHERE email=${email} AND status=${true}", {
			email: email.trim().toLowerCase(),
            true: true,
        });

        if (lead != null) {
            if(lead.id != req.params.id) {
                functions.returnErrorData(res, errors.err401, 'Já existe um doador com este email.');
                return;
            } else {
                update();
            }
        } else {
            update();
        }

        async function update () {
            let nombres = first_name.trim().split(' ');
            let apellidos = last_name.trim().split(' ');

            for (let i=0; i < nombres.length; i++) {
                nombres[i] = functions.firstToUpper(nombres[i].toLowerCase());
            }

            for (let i=0; i < apellidos.length; i++) {
                apellidos[i] = functions.firstToUpper(apellidos[i].toLowerCase());
            }

            client = await db.oneOrNone("UPDATE clients SET email=${email}, first_name=${first_name}, "+
            "last_name=${last_name}, sex=${sex}, phone=${phone}, updated_at=${date}, "+
            "birth_date=${birth_date}, cpf=${cpf}, cep=${cep}, state=${state}, "+
            "city=${city}, urbanization=${urbanization}, address=${address}, complement=${complement}, "+
            "number=${number}, type=${type} WHERE id=${id} RETURNING *", {
                id: req.params.id,
                email: email.trim().toLowerCase(),
                first_name: nombres.join(' '),
                last_name: apellidos.join(' '),
                sex: sex ? sex : '',
                phone: String(phone).trim(),
                date: functions.date(),
                birth_date: birth_date ? birth_date : null,
                cpf: cpf ? String(cpf).trim() : '',
                cep: cep ? String(cep).trim() : '',
                state: state ? state.trim() : '',
                city: city ? city.trim() : '',
                urbanization: urbanization ? urbanization.trim() : '',
                address: address ? address.trim() : '',
                complement: complement ? complement.trim() : '',
                number: number ? String(number).trim() : '',
                type: type.trim(),
            });
            
            if (client!=null) {
                req.body.client_id=client.id;
                functions.insertAudit(user_id, "Doador", "atualização", `Doador ${email.trim().toLowerCase()} atualizado`, req);
                functions.insertHistoric(req, "Atualização", "Atualização de doador", 0, true, 0, functions.origin_data);

                let companies = await db.manyOrNone("SELECT c.* FROM companies c LEFT JOIN clients_has_companies cc ON c.id=cc.company_id AND c.status=${true} WHERE cc.client_id=${client_id}", {
                    true: true,
                    client_id: client.id,
                });

                functions.returnSuccessData(res, {sms: "Doador atualizado", client: client, companies: companies});
            } else {
                functions.returnErrorData(res, errors.err503, "O doador não pôde ser atualizado");
                return;
            }
        }
	} catch (error) {
		return functions.errorBD(res, error, user_id, "Doador", "atualização", req);
    }
});

router.get('/view/:id/:user_id', upload.array(), function(req, res) {

    db.oneOrNone("SELECT * FROM clients WHERE id=${id} AND status=${true}",{
        id: req.params.id,
        true: true,
    }).then(result => {
        if (result != null) {
            db.manyOrNone("SELECT c.* FROM companies c LEFT JOIN clients_has_companies cc ON c.id=cc.company_id AND c.status=${true} WHERE cc.client_id=${client_id}", {
                true: true,
                client_id: req.params.id,
            }).then(companies => {
                functions.returnSuccessData(res, {client: result, companies: companies});
            }).catch(error => {
                return functions.errorBD(res, error, req.params.user_id, "Doador", "detalhe", req);
            });
        } else {
            functions.returnSuccessData(res, null);
        }
    }).catch(error => {
        functions.errorBD(res, error, req.params.user_id, "Doador", "detalhe", req);
        return;
    });
});

router.get('/all/:user_id', upload.array(), function(req, res) {

    db.manyOrNone("SELECT c.* FROM clients WHERE status=${true}",{
        true: true,
    }).then(result => {
        if (result != null && result.length > 0) {
            functions.returnSuccessData(res, result);
        } else {
            functions.returnSuccessData(res, null);
        }
    }).catch(error => {
        functions.errorBD(res, error, req.params.user_id, "Doador", "listar tudo", req);
        return;
    });
});

router.get('/company_all/:id/:user_id', upload.array(), function(req, res) {

    db.manyOrNone("SELECT c.* FROM clients c LEFT JOIN clients_has_companies cc ON c.id=cc.client_id AND c.status=${true} WHERE cc.company_id=${id}",{
        id: req.params.id,
        true: true,
    }).then(result => {
        if (result != null && result.length > 0) {
            functions.returnSuccessData(res, result);
        } else {
            functions.returnSuccessData(res, null);
        }
    }).catch(error => {
        functions.errorBD(res, error, req.params.user_id, "Doador", "listar", req);
        return;
    });
});

router.delete('/delete/:id/:user_id', upload.array(), function(req, res) {

    db.oneOrNone('SELECT * FROM clients WHERE id=${id}',{
        id: req.params.id,
    }).then(data => {
        if (data != null) {
            db.none("UPDATE clients SET status=${false} WHERE id=${id}", {
                id: req.params.id,
                false: false,
            });
            functions.insertAudit(req.params.user_id, "Doador", "eliminar", "Doador removido", req);
            functions.returnSuccessData(res, "Doador removido");
        } else {
            functions.returnErrorData(res, errors.err404, 'O doador não existe');
            return;
        }
    }).catch(error => {
        functions.errorBD(res, error, req.params.user_id, "Doador", "eliminar", req);
        return;
    });
});

router.get('/search/:email/:user_id', upload.array(), async (req, res) => {
    let { email, user_id } = req.params;

    try {
        client = await db.manyOrNone("SELECT c.*, u.first_name AS user_first_name, u.last_name AS user_last_name, u.email AS user_email, cu.user_id AS cu_user_id, cu.active AS cu_active, cu.id AS cu_id FROM clients c LEFT JOIN clients_has_users cu ON c.id=cu.client_id LEFT JOIN users u ON u.id=cu.user_id AND u.status=${true} WHERE c.email=${email} AND c.status=${true}", {
            email: email.trim().toLowerCase(),
            true: true,
        });

        if(client!=null && client.length > 0) {
            let disponible = false, posicion=0;
            for (let i = 0; i < client.length; i++) {
                if (client[i].cu_user_id==user_id && client[i].cu_active==true) {
                    disponible=true;
                    posicion=i;
                }
            }

            if(disponible==true) {
                let companies = await db.manyOrNone("SELECT c.* FROM companies c LEFT JOIN clients_has_companies cc ON c.id=cc.company_id AND c.status=${true} WHERE cc.client_id=${client_id}", {
                    true: true,
                    client_id: client[posicion].id,
                });
                
                let firstCompany = await db.oneOrNone("SELECT c.id FROM clients_has_companies cc, companies c WHERE cc.client_id=${client_id} AND cc.company_id=c.id AND c.status=${true} ORDER BY cc.id ASC LIMIT 1", {
                    client_id: client[posicion].id,
                    true: true
                });

                functions.returnSuccessData(res, {client: client[posicion], companies: companies, firstCompany: firstCompany.id});
            } else {
                return functions.returnErrorData(res, errors.err401, "Você não pode atender a este doador porque você não tem");
            }
        } else {
            return functions.returnErrorData(res, errors.err404, "O doador não existe");
        }
    } catch (error) {
        return functions.errorBD(res, error, user_id, "Doador", "achar", req);
    }
});

router.get('/historic/:id/:user_id', upload.array(), async (req, res) => {

	try {
        let historic = await db.manyOrNone("SELECT h.event, h.description, h.user_id, h.client_id, h.date, h.status, h.campain_id, h.origin_data, u.first_name, u.last_name, d.id AS d_id, d.amount, d.confirmed, d.type, d.method, d.monthly_year_payment, ca.name AS campain_name, cs.id AS cs_id, cs.effective, cs.name AS cs_name, cb.id AS cb_id, cb.name AS cb_name, co.name AS company_name, ct.name AS cancelation_name "+
        "FROM historic AS h LEFT JOIN users AS u ON h.user_id=u.id LEFT JOIN companies AS co ON h.company_id=co.id AND co.status=${true} "+
        "LEFT JOIN clients AS cl ON h.client_id=cl.id LEFT JOIN donations AS d ON h.reference_id=d.id "+
        "LEFT JOIN campains AS ca ON h.campain_id=ca.id LEFT JOIN call_status AS cs ON h.reference_id=cs.id "+
        "LEFT JOIN contactability AS cb ON h.reference_id=cb.id LEFT JOIN cancelations AS ct ON h.reference_id=ct.id WHERE cl.id=${id} ORDER BY h.id DESC LIMIT 20", {
            id: req.params.id,
            true: true,
        });
        
        if (historic.length > 0) {
            let historical = historic.map(async iterator => {
                if (iterator.event==='Registro' || iterator.event==='Atualização' || iterator.event==='Ordem') {
                    return history = {
                        title: iterator.event,
                        description: iterator.description,
                        date: iterator.date,
                        status: iterator.status,
                        user_id: iterator.user_id,
                        user: `${iterator.first_name} ${iterator.last_name}`,
                        origin_data: iterator.origin_data,
                        company_name: iterator.company_name,
                    }
                } else if (iterator.event === 'Intenção de doação') {
                    return history = {
                        title: iterator.event,
                        description: iterator.description,
                        date: iterator.date,
                        status: iterator.status,
                        user_id: iterator.user_id,
                        user: `${iterator.first_name} ${iterator.last_name}`,
                        campaign_id: iterator.campain_id,
                        campaign_name: iterator.campain_name,
                        donation_id: iterator.d_id,
                        amount: iterator.amount,
                        confirmed: iterator.confirmed,
                        type: iterator.type,
                        origin_data: iterator.origin_data,
                        company_name: iterator.company_name,
                    }
                } else if (iterator.event === 'Resultado do contato') {
                    return history = {
                        title: iterator.event,
                        description: iterator.description,
                        date: iterator.date,
                        status: iterator.status,
                        user_id: iterator.user_id,
                        user: `${iterator.first_name} ${iterator.last_name}`,
                        campaign_id: iterator.campain_id,
                        campaign_name: iterator.campain_name,
                        call_status_id: iterator.cs_id,
                        call_status_name: iterator.cs_name,
                        effective: iterator.effective,
                        origin_data: iterator.origin_data,
                        company_name: iterator.company_name,
                    }
                } else if (iterator.event === 'Não contatado') {
                    return history = {
                        title: iterator.event,
                        description: iterator.description,
                        date: iterator.date,
                        status: iterator.status,
                        user_id: iterator.user_id,
                        user: `${iterator.first_name} ${iterator.last_name}`,
                        campaign_id: iterator.campain_id,
                        campaign_name: iterator.campain_name,
                        contactability_id: iterator.cb_id,
                        contactability_name: iterator.cb_name,
                        origin_data: iterator.origin_data,
                        company_name: iterator.company_name,
                    }
                } else if (iterator.event === 'Doação') {
                    return history = {
                        title: iterator.event,
                        description: iterator.description,
                        date: iterator.date,
                        status: iterator.status,
                        user_id: iterator.user_id,
                        user: `${iterator.first_name} ${iterator.last_name}`,
                        campaign_id: iterator.campain_id,
                        campaign_name: iterator.campain_name,
                        donation_id: iterator.d_id,
                        amount: iterator.amount,
                        confirmed: iterator.confirmed,
                        type: iterator.type,
                        origin_data: iterator.origin_data,
                        company_name: iterator.company_name,
                        method: iterator.method,
                        monthly_year_payment: iterator.monthly_year_payment,
                    }
                } else if (iterator.event === 'Cancelamento') {
                    return history = {
                        title: iterator.event,
                        description: iterator.description,
                        date: iterator.date,
                        status: iterator.status,
                        user_id: iterator.user_id,
                        user: `${iterator.first_name} ${iterator.last_name}`,
                        campaign_id: iterator.campain_id,
                        campaign_name: iterator.campain_name,
                        donation_id: iterator.d_id,
                        amount: iterator.amount,
                        confirmed: iterator.confirmed,
                        type: iterator.type,
                        origin_data: iterator.origin_data,
                        company_name: iterator.company_name,
                        method: iterator.method,
                        cancelation_name: iterator.cancelation_name,
                    }
                } else if (iterator.event === 'Doação atualizada') {
                    return history = {
                        title: iterator.event,
                        description: iterator.description,
                        date: iterator.date,
                        status: iterator.status,
                        user_id: iterator.user_id,
                        user: `${iterator.first_name} ${iterator.last_name}`,
                        campaign_id: iterator.campain_id,
                        campaign_name: iterator.campain_name,
                        donation_id: iterator.d_id,
                        amount: iterator.amount,
                        confirmed: iterator.confirmed,
                        type: iterator.type,
                        origin_data: iterator.origin_data,
                        company_name: iterator.company_name,
                        method: iterator.method,
                    }
                }
            });
            historical = await Promise.all(historical)
            functions.returnSuccessData(res, historical);
        } else {
            functions.returnErrorData(res, errors.err404, "Não há dados históricos");
        }
		
	} catch (error) {
		return functions.errorBD(res, error, req.params.user_id, "Doador", "histórico", req);
	}
});

/*router.get('/benefactor/:user_id/:option/:first_date?/:second_date?', upload.array(), function(req, res) {
    functions.printRoute(req);

    if (req.params.option=='Btw') {
        db.manyOrNone("SELECT h.*, cl.email, cl.first_name, cl.last_name, ca.name AS campain_name, o.id AS organization_id, o.name AS organization_name, d.amount FROM historic h, clients cl, campains ca, companies o, donations d WHERE h.user_id=${user_id} AND h.event=${event} AND h.status=${true} AND h.client_id=cl.id AND h.campain_id=ca.id AND ca.status=${true} AND o.id=cl.company_id AND o.status=${true} AND cl.status=${true} AND h.reference_id=d.id AND d.status=${true} AND d.confirmed=${true} AND h.date BETWEEN ${first_date} AND ${second_date} ORDER BY h.id ASC",{
            user_id: req.params.user_id,
            true: true,
            event: 'Intenção de doação',
            first_date: req.params.first_date,
            second_date: req.params.second_date,
        }).then(data => {
            if (data != null && data.length > 0) {
                functions.returnSuccessData(res, data);
            } else {
                functions.returnErrorData(res, errors.err404, {sms:'Não há doadores neste período', data:null});
                return;
            }
        }).catch(error => {
            functions.errorBD(res, error, req.params.user_id, "Doador", "benfeitores", req);
            return;
        });
    } else { 
        db.manyOrNone("SELECT h.*, cl.email, cl.first_name, cl.last_name, ca.name AS campain_name, o.id AS organization_id, o.name AS organization_name, d.amount FROM historic h, clients cl, campains ca, companies o, donations d WHERE h.user_id=${user_id} AND h.event=${event} AND h.status=${true} AND h.reference_id=d.id AND d.status=${true} AND d.confirmed=${true} AND h.client_id=cl.id AND h.campain_id=ca.id AND ca.status=${true} AND o.id=cl.company_id AND o.status=${true} AND cl.status=${true} AND h.date >= ${fecha} ORDER BY h.id ASC",{
            user_id: req.params.user_id,
            true: true,
            fecha: functions.filterDateToQuery(req.params.option),
            event: 'Intenção de doação',
        }).then(data => {
            if (data != null && data.length > 0) {
                functions.returnSuccessData(res, data);
            } else {
                functions.returnErrorData(res, errors.err404, {sms:'Não há doadores neste período', data:null});
                return;
            }
        }).catch(error => {
            functions.errorBD(res, error, req.params.user_id, "Doador", "benfeitores", req);
            return;
        });
    }
});*/

router.put('/add_companies', upload.array(), async (req, res) => {
    
    let { user_id, client_id, companies_id} = req.body;

    try {
        let companies = await db.manyOrNone("SELECT id FROM clients_has_companies WHERE client_id=${client_id}", {
            client_id,
        });

        if(companies!=null && companies.length > 0) {
            await db.none("DELETE FROM clients_has_companies WHERE client_id=${client_id}", {
                client_id,
            });
        }

        if(companies_id.length > 0) {
            companies_id.forEach(async element => {
                await db.none("INSERT INTO clients_has_companies (company_id, client_id) VALUES (${company_id}, ${client_id})", {
                    company_id: element,
                    client_id,
                });
            });
            functions.returnSuccessData(res, "Associações atribuídas");
        } else {
            functions.returnSuccessData(res, "Associações removidos");
        }
    } catch (error) {
        return functions.errorBD(res, error, user_id, "Doador", "atribuir associações", req);
    }
});

router.get('/without_companies/:client_id/:user_id', upload.array(), async (req, res) => {
    
    let { user_id, client_id } = req.params;

    try {
        let clients_has_companies = await db.manyOrNone("SELECT company_id FROM clients_has_companies WHERE client_id=${client_id}", {
            client_id,
        });

        if(clients_has_companies!=null && clients_has_companies.length > 0) {
            let companies = await db.manyOrNone("SELECT * FROM companies WHERE status=${true}", {
                true: true,
            });

            let assigned = new Array();

            companies.forEach(element => {
                let existe = false;
                clients_has_companies.forEach(element2 => {
                    if(element2.company_id==element.id) {
                        existe=true;
                    }
                });

                if(existe==false) {
                    assigned.push(element);
                }
            });
            functions.returnSuccessData(res, assigned);
        } else {
            functions.returnErrorData(res, errors.err404, "O doador não possui associações designadas");
        }
    } catch (error) {
        return functions.errorBD(res, error, user_id, "Doador", "associações sem atribuição", req);
    }
});

router.get('/contacts/:user_id/:option/:first_date?/:second_date?', upload.array(), function(req, res) {
    
    if (req.params.option=='Btw') {
        db.manyOrNone("SELECT h.*, cl.email, cl.first_name, cl.last_name, ca.name AS campain_name FROM historic h, clients cl, campains ca WHERE h.user_id=${user_id} AND h.event=${event} AND h.status=${true} AND h.client_id=cl.id AND h.campain_id=ca.id AND ca.status=${true} AND cl.status=${true} AND h.date BETWEEN ${first_date} AND ${second_date} ORDER BY h.id ASC",{
            user_id: req.params.user_id,
            true: true,
            first_date: req.params.first_date,
            second_date: req.params.second_date,
            event: 'Resultado do contato',
        }).then(data => {
            if (data != null && data.length > 0) {
                functions.returnSuccessData(res, data);
            } else {
                functions.returnErrorData(res, errors.err404, {sms:'Não há doadores contados neste período', data:null});
                return;
            }
        }).catch(error => {
            functions.errorBD(res, error, req.params.user_id, "Doador", "contatado", req);
            return;
        });
    } else {
        db.manyOrNone("SELECT h.*, cl.email, cl.first_name, cl.last_name, ca.name AS campain_name FROM historic h, clients cl, campains ca WHERE h.user_id=${user_id} AND h.event=${event} AND h.status=${true} AND h.client_id=cl.id AND cl.status=${true} AND h.campain_id=ca.id AND ca.status=${true} AND h.date >= ${fecha} ORDER BY h.id ASC",{
            user_id: req.params.user_id,
            true: true,
            fecha: functions.filterDateToQuery(req.params.option),
            event: 'Resultado do contato',
        }).then(data => {
            if (data != null && data.length > 0) {
                functions.returnSuccessData(res, data);
            } else {
                functions.returnErrorData(res, errors.err404, {sms:'Não há doadores contados neste período', data:null});
                return;
            }
        }).catch(error => {
            functions.errorBD(res, error, req.params.user_id, "Doador", "contatado", req);
            return;
        });
    }
});

router.get('/dashboard_not_assigned/:user_id/:company_id/:nuevosDevueltos/:code/:first_date?/:last_date?', upload.array(), async (req, res) => {
    
    let { user_id, company_id, code, first_date, last_date, nuevosDevueltos } = req.params;
    // nuevosDevueltos => true: nuevos, false: devueltos
    if (code == 'customized') {
        first_date = `${first_date} 00:00:00`;
        last_date = `${last_date} 23:59:59`;
    } else {
        first_date = functions.filterDateToQuery('All');
        last_date = functions.date();
    }

    let totalEncomiendas=0, nuevosEncomiendas=0, devueltosEncomiendas=0, urlsEncomiendas=[],
    totalIntencion=0, nuevosIntencion=0, devueltosIntencion=0, urlsIntencion=[],
    totalBaixe=0, nuevosBaixe=0, devueltosBaixe=0, urlsBaixe=[];

    try {
        let clients;
        if (nuevosDevueltos=="true") { // traer nuevos leds
            clients = await db.manyOrNone("SELECT c.id, c.created_at, c.updated_at, c.assigned, c.type, h.origin_data FROM clients c, clients_has_companies cc, companies a, historic h WHERE c.status=${true} AND cc.client_id=c.id AND cc.company_id=a.id AND a.status=${true} AND a.id=${company_id} AND h.client_id=c.id AND h.event=${event} AND h.description=${description} AND h.company_id=a.id AND c.created_at=c.updated_at AND c.created_at BETWEEN ${first_date} AND ${last_date}", {
                true: true,
                company_id,
                first_date,
                last_date,
                event: 'Registro',
                description: 'Registro de doador',
                false: false
            });
        } else { // traer leads devueltos
            clients = await db.manyOrNone("SELECT c.id, c.created_at, c.updated_at, c.assigned, c.type, h.origin_data FROM clients c, clients_has_companies cc, companies a, historic h WHERE c.status=${true} AND cc.client_id=c.id AND cc.company_id=a.id AND a.status=${true} AND a.id=${company_id} AND h.client_id=c.id AND h.event=${event} AND h.description=${description} AND h.company_id=a.id AND c.created_at!=c.updated_at AND c.attended=${false} AND c.created_at BETWEEN ${first_date} AND ${last_date}", {
                true: true,
                company_id,
                first_date,
                last_date,
                event: 'Registro',
                description: 'Registro de doador',
                false: false
            });
        }

        if(clients!=null && clients.length>0) { // LEADS
            //let counter = 0;
            clients.forEach(element => {
                //console.log(counter++); // LIMITE ACTUAL 9514 CICLOS
                if(element.type=='Intenção de doação') { // INTENCION DE DONACION
                    totalIntencion = totalIntencion + 1; // total
                    if(element.assigned==false && element.created_at == element.updated_at) {
                        nuevosIntencion = nuevosIntencion + 1; // nuevos
                    } else if (element.assigned==false && element.created_at != element.updated_at) {
                        devueltosIntencion = devueltosIntencion +1; // devueltos
                    }

                    // URL 
                    let urlExiste=false, nuevosUrl=0, devueltosUrl=0;

                    urlsIntencion.forEach(url => {
                        if(url.name==element.origin_data) { // la url existe previamente en el array
                            urlExiste=true; // dice que ya existe esta url en el array
                            url.totalLeads = url.totalLeads + 1;
                            if(element.assigned==false && element.created_at == element.updated_at) {
                                url.nuevosLeads = url.nuevosLeads + 1; // nuevos Url
                            } else if (element.assigned==false && element.created_at != element.updated_at) {
                                url.leadsDevueltos = url.leadsDevueltos + 1; // devueltos Url
                            }
                        }
                    });

                    if(urlExiste==false) {
                        if(element.assigned==false && element.created_at == element.updated_at) {
                            nuevosUrl = 1; // nuevos Url
                        } else if (element.assigned==false && element.created_at != element.updated_at) {
                            devueltosUrl = 1; // devueltos Url
                        }
                        urlsIntencion.push({
                            name: element.origin_data,
                            totalLeads: 1,
                            nuevosLeads: nuevosUrl,
                            leadsDevueltos: devueltosUrl
                        });
                    }
                } else if (element.type=='Baixe') { // DESCARGA
                    totalBaixe = totalBaixe + 1; // total
                    if(element.assigned==false && element.created_at == element.updated_at) {
                        nuevosBaixe = nuevosBaixe + 1; // nuevos
                    } else if (element.assigned==false && element.created_at != element.updated_at) {
                        devueltosBaixe = devueltosBaixe + 1; // devueltos
                    }

                    // URL 
                    let urlExiste=false, nuevosUrl=0, devueltosUrl=0;

                    urlsBaixe.forEach(url => {
                        if(url.name==element.origin_data) { // la url existe previamente en el array
                            urlExiste=true; // dice que ya existe esta url en el array
                            url.totalLeads = url.totalLeads + 1;
                            if(element.assigned==false && element.created_at == element.updated_at) {
                                url.nuevosLeads = url.nuevosLeads + 1; // nuevos Url
                            } else if (element.assigned==false && element.created_at != element.updated_at) {
                                url.leadsDevueltos = url.leadsDevueltos + 1; // devueltos Url
                            }
                        }
                    });

                    if(urlExiste==false) {
                        if(element.assigned==false && element.created_at == element.updated_at) {
                            nuevosUrl = 1; // nuevos Url
                        } else if (element.assigned==false && element.created_at != element.updated_at) {
                            devueltosUrl = 1; // devueltos Url
                        }
                        urlsBaixe.push({
                            name: element.origin_data,
                            totalLeads: 1,
                            nuevosLeads: nuevosUrl,
                            leadsDevueltos: devueltosUrl
                        });
                    }
                } else if (element.type=='Encomendas') { // ENCOMIENDAS
                    totalEncomiendas = totalEncomiendas + 1; // total
                    if(element.assigned==false && element.created_at == element.updated_at) {
                        nuevosEncomiendas = nuevosEncomiendas + 1; // nuevos
                    } else if (element.assigned==false && element.created_at != element.updated_at) {
                        devueltosEncomiendas = devueltosEncomiendas + 1; // devueltos
                    }

                    // URL 
                    let urlExiste=false, nuevosUrl=0, devueltosUrl=0;

                    urlsEncomiendas.forEach(url => {
                        if(url.name==element.origin_data) { // la url existe previamente en el array
                            urlExiste=true; // dice que ya existe esta url en el array
                            url.totalLeads = url.totalLeads + 1;
                            if(element.assigned==false && element.created_at == element.updated_at) {
                                url.nuevosLeads = url.nuevosLeads + 1; // nuevos Url
                            } else if (element.assigned==false && element.created_at != element.updated_at) {
                                url.leadsDevueltos = url.leadsDevueltos + 1; // devueltos Url
                            }
                        }
                    });

                    if(urlExiste==false) {
                        if(element.assigned==false && element.created_at == element.updated_at) {
                            nuevosUrl = 1; // nuevos Url
                        } else if (element.assigned==false && element.created_at != element.updated_at) {
                            devueltosUrl = 1; // devueltos Url
                        }
                        urlsEncomiendas.push({
                            name: element.origin_data,
                            totalLeads: 1,
                            nuevosLeads: nuevosUrl,
                            leadsDevueltos: devueltosUrl
                        });
                    }
                }
            });

            functions.returnSuccessData(res, {
                totalEncomiendas: totalEncomiendas, 
                nuevosEncomiendas: nuevosEncomiendas, 
                devueltosEncomiendas: devueltosEncomiendas, 
                urlsEncomiendas: urlsEncomiendas,
                totalIntencion: totalIntencion, 
                nuevosIntencion: nuevosIntencion, 
                devueltosIntencion: devueltosIntencion, 
                urlsIntencion: urlsIntencion,
                totalBaixe: totalBaixe, 
                nuevosBaixe: nuevosBaixe, 
                devueltosBaixe: devueltosBaixe, 
                urlsBaixe: urlsBaixe,
            });
        } else {
            return functions.returnErrorData(res, errors.err404, "Não há doadores não atribuídos");
        }
    } catch (error) {
        return functions.errorBD(res, error, user_id, "Doador", "atribuições", req);
    }
});

router.get('/assigned/:user_id', upload.array(), async (req, res) => {
    
    let { user_id } = req.params;

    try {
        let clients = await db.manyOrNone("SELECT c.id, c.email, u.email AS user_email, h.date, h.origin_data FROM clients c, users u, clients_has_users cu, historic h WHERE c.status=${true} AND c.assigned=${true} AND u.id=cu.user_id AND c.id=cu.client_id AND u.status=${true} AND h.event=${event} AND h.status=${true} AND c.id=h.client_id", {
            true: true,
            event: 'Registro',
        });

        if(clients!=null && clients.length>0) {
            functions.returnSuccessData(res, clients);
        } else {
            return functions.returnErrorData(res, errors.err404, "Não há doadores atribuídos");
        }
    } catch (error) {
        return functions.errorBD(res, error, user_id, "Doador", "atribuído", req);
    }
});

router.get('/user_with_assigned/:user_with_assigned/:user_id', upload.array(), async (req, res) => {
    
    let { user_id, user_with_assigned } = req.params;

    try {
        let clients = await db.manyOrNone("SELECT c.*, h.date, h.origin_data FROM clients c, clients_has_users cu, historic h WHERE c.status=${true} AND c.assigned=${true} AND cu.user_id=${user_id} AND c.id=cu.client_id AND cu.active=${true} AND h.event=${event} AND h.description=${description} AND h.status=${true} AND c.id=h.client_id", {
            true: true,
            user_id: user_with_assigned,
            event: 'Registro',
            description: 'Registro de doador'
        });

        if(clients!=null && clients.length>0) {
            functions.returnSuccessData(res, clients);
        } else {
            return functions.returnErrorData(res, errors.err404, "Não há doadores atribuídos a este usuário");
        }
    } catch (error) {
        return functions.errorBD(res, error, user_id, "Doador", "usuário com atribuições", req);
    }
});

router.post('/to_assign', upload.array(), async (req, res) => { // asignaciones
    
    let {
        user_id,
        company_id,
        code,
        first_date,
        last_date,
        nuevosDevueltos,
        user_to_assign, // array que contiene los ids de usuarios para asignarles leads
        urls, // array que tiene nombre de url, cantidad de leds a asignar y tipo de lead {name, cantidad, type}
    } = req.body;

    if (code == 'customized') {
        first_date = `${first_date} 00:00:00`;
        last_date = `${last_date} 23:59:59`;
    } else {
        first_date = functions.filterDateToQuery('All');
        last_date = functions.date();
    }

    try {
        if(user_to_assign.length > 0) {
            let users = [];
            for (let i = 0; i < urls.length; i++) {
                // RANDOM filtra los datos a obtener por fechas (first_date last_date) y si es nuevo o viejo
                let clients;

                if(nuevosDevueltos==true) { // trae los nuevos
                    clients = await db.manyOrNone("SELECT c.id FROM clients c, clients_has_companies cc, companies a, historic h WHERE c.status=${true} AND c.assigned=${false} AND c.type=${type} AND cc.client_id=c.id AND cc.company_id=a.id AND a.id=${company_id} AND a.status=${true} AND h.client_id=c.id AND h.event=${event} AND h.description=${description} AND h.origin_data=${url_name} AND c.created_at=c.updated_at AND c.created_at BETWEEN ${first_date} AND ${last_date} LIMIT ${limit}", {
                        true: true,
                        false: false,
                        company_id,
                        type: urls[i].type,
                        event: 'Registro',
                        description: 'Registro de doador',
                        url_name: urls[i].name,
                        limit: urls[i].cantidad,
                        first_date,
                        last_date,
                    });
                } else { // trae los devueltos
                    clients = await db.manyOrNone("SELECT c.id FROM clients c, clients_has_companies cc, companies a, historic h WHERE c.status=${true} AND c.assigned=${false} AND c.type=${type} AND cc.client_id=c.id AND cc.company_id=a.id AND a.id=${company_id} AND a.status=${true} AND h.client_id=c.id AND h.event=${event} AND h.description=${description} AND h.origin_data=${url_name} AND c.created_at!=c.updated_at AND c.attended=${false} AND c.created_at BETWEEN ${first_date} AND ${last_date} LIMIT ${limit}", {
                        true: true,
                        false: false,
                        company_id,
                        type: urls[i].type,
                        event: 'Registro',
                        description: 'Registro de doador',
                        url_name: urls[i].name,
                        limit: urls[i].cantidad,
                        first_date,
                        last_date,
                    });
                }

                if(clients!=null && clients.length>0) {
                    for (let j = 0; j < clients.length; j++) {
                        let random = Math.floor(Math.random()*user_to_assign.length);
                        
                        await db.none("INSERT INTO clients_has_users (user_id, client_id) VALUES (${user_id}, ${client_id})", {
                            user_id: user_to_assign[random],
                            client_id: clients[j].id,
                        });

                        await db.none("UPDATE clients SET assigned=${true}, attended=${false}, updated_at=${date} WHERE id=${client_id}", {
                            true: true,
                            false: false,
                            client_id: clients[j].id,
                            date: functions.date(),
                        });

                        let existe=false;
                        let usuario = await db.oneOrNone("SELECT id, email FROM users WHERE id=${id} AND status=${true}", {
                            id: user_to_assign[random],
                            true: true,
                        });

                        for (let k = 0; k < users.length; k++) {
                            if(users[k].id==user_to_assign[random]) {
                                existe=true;
                                users[k].asignados = users[k].asignados + 1;
                            }
                        }

                        if (existe==false) {
                            users.push({id: usuario.id, email: usuario.email, asignados: 1});
                        }
                    }
                }
                // RANDOM END
            }
            functions.returnSuccessData(res, {sms: "Doadores atribuídos", users: users});
        } else {
            functions.returnErrorData(res, errors.err401, "Nenhum usuário selecionado");
        }
    } catch (error) {
        return functions.errorBD(res, error, user_id, "Doador", "atribuir", req);
    }
});

router.put('/update_assignments', upload.array(), async (req, res) => {
    
    let { user_id, clients_ids, user_to_assign} = req.body;

    try {
        let clients = await db.manyOrNone("SELECT client_id FROM clients_has_users WHERE user_id=${user_id}", {
            user_id: user_to_assign,
        });

        if(clients!=null && clients.length > 0) {
            clients.forEach(async element => {
                await db.none("UPDATE clients SET assigned=${false}, attended=${false}, updated_at=${date} WHERE id=${client_id}", {
                    false: false,
                    client_id: element.client_id,
                    date: functions.date(),
                });
            });

            await db.none("DELETE FROM clients_has_users WHERE user_id=${user_id} AND active=${true}", {
                true: true,
                user_id: user_to_assign,
            });
        }
            
        if(clients_ids.length > 0) {
            clients_ids.forEach(async element => {
                await db.none("INSERT INTO clients_has_users (user_id, client_id) VALUES (${user_id}, ${client_id})", {
                    user_id: user_to_assign,
                    client_id: element,
                });
                
                await db.none("UPDATE clients SET assigned=${true}, updated_at=${date} WHERE id=${client_id}", {
                    true: true,
                    client_id: element,
                    date: functions.date(),
                });
            });
            functions.returnSuccessData(res, "Doadores atribuídos");
        } else {
            functions.returnSuccessData(res, "Dadores removidos");
        }
        
    } catch (error) {
        return functions.errorBD(res, error, user_id, "Doador", "atualizar atribuições", req);
    }
});

router.put('/pool_return', upload.array(), async (req, res) => {
    
    let { user_id, client_id } = req.body;

    try {
        await db.none("UPDATE clients SET assigned=${false}, attended=${false}, updated_at=${date} WHERE id=${client_id}", {
            false: false,
            client_id: client_id,
            date: functions.date(),
        });

        await db.none("DELETE FROM clients_has_users WHERE client_id=${id} AND active=${true}", {
            true: true,
            id: client_id,
        });

        functions.insertHistoric(req, "Atualização", `Doador voltou para a pool.`, 0, true, 0, functions.origin_data);
        
        functions.returnSuccessData(res, "Doador retornou ao pool");
        
    } catch (error) {
        return functions.errorBD(res, error, user_id, "Doador", "voltar para a pool", req);
    }
});

router.post('/round_robin', upload.array(), async (req, res) => {
    
    let { user_id } = req.body;

    try {
        let users = await db.manyOrNone("SELECT id FROM users WHERE role_id=${role} AND status=${true} AND estatus=${true} AND id>${id}", {
            true: true,
            role: 3, // operadores
            id: 0,
        });

        if (users!=null && users.length>0) {
            let clients = await db.manyOrNone("SELECT id FROM clients WHERE status=${true} AND assigned=${false} AND attended=${false}", {
                true: true,
                false: false,
            });

            if(clients!=null && clients.length>0) {

                clients.forEach(async element => {
                    let random = Math.floor(Math.random()*users.length);
                    
                    await db.none("INSERT INTO clients_has_users (user_id, client_id) VALUES (${user_id}, ${client_id})", {
                        user_id: users[random].id,
                        client_id: element.id,
                    });

                    await db.none("UPDATE clients SET assigned=${true}, updated_at=${date} WHERE id=${client_id}", {
                        true: true,
                        client_id: element.id,
                        date: functions.date(),
                    });
                });

                functions.returnSuccessData(res, "Doadores atribuídos em Round Robin");
            } else {
                return functions.returnErrorData(res, errors.err404, "Não há doadores não atribuídos");
            }
        } else {
            return functions.returnErrorData(res, errors.err404, "Não há operadores ativos");
        }
    
    } catch (error) {
        return functions.errorBD(res, error, user_id, "Doador", "round robin", req);
    }
});

module.exports = router;