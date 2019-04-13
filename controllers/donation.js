const express = require('express');
const router = express.Router();
const multer = require('multer'); // v1.0.5
const upload = multer(); // for parsing multipart/form-data
const axios = require('axios');
const functions = require('./../config/helperFunctions.js');
const db = require('./../config/db.js').db;
const errors = require('./../config/errorsCode.js');

const axiosConfig = {
    headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        "Access-Control-Allow-Origin": "*",
    }
};
router.get('/clients_subscription/:client_id/:company_id/:campaign_id/:user_id', upload.array(), async (req, res) => {
	let { company_id, campaign_id, client_id, user_id} = req.params;

	try {
		let donations = await db.manyOrNone("SELECT id, amount, created_at, method, ipca FROM donations WHERE client_id=${client_id} AND status=${true} AND company_id=${company_id} AND campain_id=${campaign_id} AND method IN (${card}, ${account}) AND canceled=${false}", {
			true: true,
			client_id,
			company_id,
			campaign_id,
			card: 'Cartão',
			account: 'Conta',
			false: false,
		});

		functions.returnSuccessData(res, donations);
	} catch (error) {
		return functions.errorBD(res, error, user_id, "Doação", "Assinaturas de doadores", req);
	}
});

router.get('/get_donations/:client_id/:user_id', upload.array(), async (req, res) => {
	let { client_id, user_id } = req.params;

	try {
		let donations = await db.manyOrNone("SELECT id, amount, codcad, ipca, payment_date, method, person_type, identification_type, identification, monthly_year_payment FROM donations WHERE client_id=${client_id} AND status=${true} AND method IN (${card}, ${account}) AND canceled=${false}", {
			true: true,
			false: false,
			client_id,
			card: 'Cartão',
			account: 'Conta',
		});

		functions.returnSuccessData(res, donations);
	} catch (error) {
		return functions.errorBD(res, error, user_id, "Doação", "Obter doações", req);
	}
});

router.get('/view_donation/:donation_id/:user_id', upload.array(), async (req, res) => {
	let { donation_id, user_id } = req.params;

	try {
		let donations = await db.manyOrNone("SELECT id, amount, codcad, ipca, payment_date, method, person_type, identification_type, identification, monthly_year_payment FROM donations WHERE id=${donation_id} AND status=${true} AND method IN (${card}, ${account}) AND canceled=${false}", {
			true: true,
			false: false,
			donation_id,
			card: 'Cartão',
			account: 'Conta',
		});

		functions.returnSuccessData(res, donations);
	} catch (error) {
		return functions.errorBD(res, error, user_id, "Doação", "Obter doações", req);
	}
});

router.put('/update_donation', upload.array(), async (req, res) => {
	let { user_id, client_id, codcad, person_type, identification_type, identification,
		ipca, payment_date, amount, method, card_type, card_number, expiration_month, expiration_year, 
		account_type, bank, agency, account_number, donation_id, monthly_year_payment } = req.body;
	
	try {
		if (!person_type) { functions.returnErrorData(res, errors.err401, 'O tipo de pessoa é obrigatório.'); return;}
		if (!identification_type) { functions.returnErrorData(res, errors.err401, 'O tipo de identificação é obrigatório.'); return;}
		if (!identification) { functions.returnErrorData(res, errors.err401, 'A identificação é obrigatória.'); return;}
		if (!amount) { functions.returnErrorData(res, errors.err401, 'O quantidade é obrigatório.'); return;}
		if (!payment_date) { functions.returnErrorData(res, errors.err401, 'A data de pagamento é obrigatória.'); return;}
		if (!method) { functions.returnErrorData(res, errors.err401, 'O método é obrigatório.'); return;}
		if (!monthly_year_payment) { functions.returnErrorData(res, errors.err401, 'O mês e o ano do pagamento são obrigatórios.'); return;}
		
		let last4='';
		
		if (card_number) {
			last4 = card_number.trim().split('-');
		}
		
		let client = await db.oneOrNone("SELECT * FROM clients WHERE id=${id} AND status=${true}", {
			id: client_id,
			true: true,
		});
		
		// donacion 
		// tipo: Pontual, Mensal
		let donation = await db.oneOrNone("UPDATE donations SET amount=${amount}, user_id=${user_id}, updated_at=${date}, type=${type}, codcad=${codcad}, ipca=${ipca}, payment_date=${payment_date}, method=${method}, person_type=${person_type}, identification_type=${identification_type}, identification=${identification}, card_type=${card_type}, card_number=${card_number}, expired_month=${expired_month}, expired_year=${expired_year}, last_four=${last_four}, account_type=${account_type}, bank=${bank}, agency=${agency}, account_number=${account_number}, export=${false}, monthly_year_payment=${monthly_year_payment} WHERE id=${donation_id} RETURNING *", {
			donation_id: donation_id,
			false: false,
			amount: parseFloat(amount).toFixed(2),
			user_id,
			date: functions.date(),
			type: 'Mensal',
			codcad: codcad ? codcad.trim() : '',
			ipca,
			payment_date,
			method,
			person_type,
			identification_type,
			identification: identification.trim(),
			card_type: card_type ? functions.encrypt(card_type) : '', // encriptar
			card_number: card_number ? functions.encrypt(card_number.trim()) : '', // encriptar
			expired_month: expiration_month ? functions.encrypt(String(expiration_month).trim()) : '', // encriptar
			expired_year: expiration_year ? functions.encrypt(String(expiration_year).trim()) : '', // encriptar
			last_four: last4 ? last4[3] : '',
			account_type: account_type ? functions.encrypt(account_type) : '', // encriptar
			bank: bank ? functions.encrypt(bank.trim()) : '', // encriptar
			agency: agency ? functions.encrypt(agency.trim()) : '', // encriptar
			account_number: account_number ? functions.encrypt(account_number.trim()) : '', // encriptar
			monthly_year_payment,
		});

		if (donation!=null) {
			functions.insertHistoric(req, "Doação atualizada", `Doação de ${donation.amount} atualizada`, donation.id, true, donation.campain_id, functions.origin_data);
			functions.insertAudit(user_id, "Doação", "atualização", `${client.email.trim().toLowerCase()} doou ${donation.amount}`, req);
			functions.returnSuccessData(res, "Doação atualizada");
		} else {
			functions.insertHistoric(req, "Doação atualizada", `Doação de ${parseFloat(amount).toFixed(2)} não atualizada`, donation_id, false, 0, functions.origin_data);
			return functions.returnErrorData(res, errors.err503, "A doação não pôde ser atualizada, tente novamente");
		}
	
	} catch (error) {
		return functions.errorBD(res, error, user_id, "Doação", "atualização", req);
	}
});

router.post('/contactability', upload.array(), async (req, res) => {

	let { company_id, campaign_id, client_id, contactability_id, user_id} = req.body;

	try {
		let organizacion = await db.oneOrNone("SELECT o.url_mautic, c.name AS campaign_name, c.url FROM companies o, campains c WHERE o.id=${company_id} AND c.id=${campaign_id} AND c.company_id=o.id AND o.status=${true} AND c.status=${true}", {
			true: true,
			company_id,
			campaign_id,
		});

		if(organizacion!=null) {
			let client = await db.oneOrNone("SELECT * FROM clients WHERE id=${client_id} AND status=${true}", {
				true: true,
				client_id,
			});

			if (client != null) {
				let contactability = await db.oneOrNone("SELECT * FROM contactability WHERE id=${contactability_id} AND status=${true} AND company_id=${company_id}", {
					true: true,
					company_id,
					contactability_id,
				});

				if (contactability!=null) {
					let contactabilityData = {
						"form": contactability.form_id_mautic,
						"fields": client,
					};
				
					axios.post(organizacion.url_mautic, contactabilityData, axiosConfig)
					.then( (response) => {
						if (response.data.status == "success") {
							functions.insertHistoric(req, "Não contatado", "Envio de email", contactability_id, true, campaign_id, functions.origin_data);
							functions.insertAudit(user_id, "Doação", "não contatado", "Um email foi enviado para "+client.email, req);
							functions.returnSuccessData(res, "Um email foi enviado para o doador");
						} else {
							functions.insertHistoric(req, "Não contatado", "Envio de email", contactability_id, false, campaign_id, functions.origin_data);
							functions.insertAudit(user_id, "Doação", "não contatado", "O email não pôde ser enviado, "+response.data.error, req);
							functions.returnErrorData(res, errors.err503, 'O email não pôde ser enviado, tente novamente');
							return;
						}
					}).catch( (error) => {
						functions.insertAudit(user_id, "Doação", "não contatado", `O pedido não pôde ser enviado para Mautic, ${error}`, req);
						functions.returnErrorData(res, errors.err503, 'O pedido não pôde ser enviado para Mautic, tente novamente');
						return;
					});
				} else {
					return functions.returnErrorData(res, errors.err401, 'O contato não existe');
				}
			} else {
				return functions.returnErrorData(res, errors.err401, 'O doador não existe');
			}
		} else {
			return functions.returnErrorData(res, errors.err401, 'Nenhum dado da organização');
		}
	} catch (error) {
		return functions.errorBD(res, error, user_id, "Doação", "não contatado", req);
	}
});

router.post('/contactresult', upload.array(), async (req, res) => {
	
	let { company_id, campaign_id, client_id, call_status_id, user_id, description, effective} = req.body;

	try {
		let organizacion = await db.oneOrNone("SELECT o.url_mautic, c.name AS campaign_name, c.url FROM companies o, campains c WHERE o.id=${company_id} AND c.id=${campaign_id} AND c.company_id=o.id AND o.status=${true} AND c.status=${true}", {
			true: true,
			company_id,
			campaign_id,
		});

		if(organizacion!=null) {
			let client = await db.oneOrNone("SELECT * FROM clients WHERE id=${client_id} AND status=${true}", {
				true: true,
				client_id,
			});

			if (client != null) {

				let call_status = await db.oneOrNone("SELECT * FROM call_status WHERE id=${call_status_id} AND status=${true} AND company_id=${company_id}", {
					true: true,
					company_id,
					call_status_id,
				});

				if (call_status!=null) {
					let contactResultData = {
						"form": call_status.form_id_mautic,
						"fields": client,
					};
				
					axios.post(organizacion.url_mautic, contactResultData, axiosConfig)
					.then( async (response) => {
						if (response.data.status == "success") {
							
							// if(effective==true) { si el resultado de contacto se procesa el lead ya no es asignable
								await db.none("UPDATE clients SET attended=${true}, assigned=${false}, updated_at=${date} WHERE id=${id}", {
									true: true,
									false: false,
									id: client_id,
									date: functions.date(),
								});
								
								await db.none("UPDATE clients_has_users SET active=${false} WHERE client_id=${id} AND active=${true}", {
									true: true,
									false: false,
									id: client_id,
								});
								functions.insertHistoric(req, "Atualização", `Doador participou. ${description.trim()}`, call_status_id, true, campaign_id, functions.origin_data);
							// }
							
							functions.insertHistoric(req, "Resultado do contato", description.trim(), call_status_id, effective, campaign_id, functions.origin_data);
							functions.insertAudit(user_id, "Doação", "resultado do contato", "Resultado de contato registrado para "+client.email, req);
							functions.returnSuccessData(res, "Resultado de contato registrado");
						} else {
							functions.insertHistoric(req, "Resultado do contato", "Não foi possível enviar o e-mail de Mautic", call_status_id, false, campaign_id, functions.origin_data);
							functions.insertAudit(user_id, "Doação", "resultado do contato", "Não foi possível enviar o e-mail de Mautic", req);
							functions.returnErrorData(res, errors.err503, 'O email não pôde ser enviado, tente novamente');
							return;
						}
					}).catch( (error) => {
						functions.insertAudit(user_id, "Doação", "resultado do contato", `O pedido não pôde ser enviado para Mautic, ${error}`, req);
						functions.returnErrorData(res, errors.err503, 'O pedido não pôde ser enviado para Mautic, tente novamente');
						return;
					});
				} else {
					return functions.returnErrorData(res, errors.err401, 'O resultado do contato não existe');
				}
			} else {
				return functions.returnErrorData(res, errors.err401, 'O doador não existe');
			}
		} else {
			return functions.returnErrorData(res, errors.err401, 'Nenhum dado da organização');
		}
	} catch (error) {
		return functions.errorBD(res, error, user_id, "Doação", "resultado do contato", req);
	}
});

router.post('/cancelations', upload.array(), async (req, res) => {

	let { company_id, campaign_id, client_id, cancelation_id, user_id, donation_id} = req.body;

	try {
		let organizacion = await db.oneOrNone("SELECT o.url_mautic, c.name AS campaign_name, c.url FROM companies o, campains c WHERE o.id=${company_id} AND c.id=${campaign_id} AND c.company_id=o.id AND o.status=${true} AND c.status=${true}", {
			true: true,
			company_id,
			campaign_id,
		});

		if(organizacion!=null) {
			let client = await db.oneOrNone("SELECT * FROM clients WHERE id=${client_id} AND status=${true}", {
				true: true,
				client_id,
			});

			if (client != null) {
				let cancelation = await db.oneOrNone("SELECT * FROM cancelations WHERE id=${cancelation_id} AND status=${true} AND company_id=${company_id}", {
					true: true,
					company_id,
					cancelation_id,
				});

				if (cancelation!=null) {
					let cancelationData = {
						"form": cancelation.form_id_mautic,
						"fields": client,
					};
				
					axios.post(organizacion.url_mautic, cancelationData, axiosConfig)
					.then(async (response) => {
						if (response.data.status == "success") {
							functions.insertHistoric(req, "Cancelamento", "Envio de email", cancelation_id, true, campaign_id, functions.origin_data);
							functions.insertAudit(user_id, "Doação", "cancelamento", "Um email foi enviado para "+client.email, req);
							
							let donation = await db.oneOrNone("UPDATE donations SET canceled=${true}, updated_at=${date} WHERE id=${id} RETURNING *", {
								true: true,
								date: functions.date(),
								id: donation_id,
							});

							if(donation!=null) {
								functions.returnSuccessData(res, "Um email foi enviado para o doador, doação cancelada");
							} else {
								functions.returnSuccessData(res, "Um email foi enviado para o doador, a doação não pôde ser cancelada");
							}
						} else {
							functions.insertHistoric(req, "Cancelamento", "Envio de email", cancelation_id, false, campaign_id, functions.origin_data);
							functions.insertAudit(user_id, "Doação", "cancelamento", "O email não pôde ser enviado, "+response.data.error, req);
							functions.returnErrorData(res, errors.err503, 'O email não pôde ser enviado, tente novamente');
							return;
						}
					}).catch( (error) => {
						functions.insertAudit(user_id, "Doação", "cancelamento", `O pedido não pôde ser enviado para Mautic, ${error}`, req);
						functions.returnErrorData(res, errors.err503, 'O pedido não pôde ser enviado para Mautic, tente novamente');
						return;
					});
				} else {
					return functions.returnErrorData(res, errors.err401, 'O cancelamento não existe');
				}
			} else {
				return functions.returnErrorData(res, errors.err401, 'O doador não existe');
			}
		} else {
			return functions.returnErrorData(res, errors.err401, 'Nenhum dado da organização');
		}
	} catch (error) {
		return functions.errorBD(res, error, user_id, "Doação", "cancelamento", req);
	}
});

router.post('/add', upload.array(), async (req, res) => {
	req.body.user_id=0;
	let { donation, order, first_name, last_name, email, phone, sex, birth_date, cpf, cep, state,
		city, urbanization, address, complement, number, user_id, origin_data} = req.body;
	origin_data=origin_data.trim();
	
	if(!req.headers.authorization) {
		return functions.returnErrorData(res, errors.err503, "Você deve enviar o cabeçalho de autorização");
	}

	try {
		if (!email) { functions.returnErrorData(res, errors.err401, 'Mail é obrigatório.'); return;}
		if (!first_name) { functions.returnErrorData(res, errors.err401, 'O nome é obrigatório.'); return;}
		
		let organization = await db.oneOrNone("SELECT * FROM companies WHERE status=${true} AND api_key=${api_key}", {
			true: true,
			api_key: req.headers.authorization.trim(),
		});

		if(organization!=null) {
        	req.body.company_id=organization.id;

			let client = await db.oneOrNone("SELECT * FROM clients WHERE email=${email} AND status=${true}", {
				true: true,
				email: email.trim().toLowerCase(),
			});

			let type='', clientResult;

			if (donation && !order) {
				type="Intenção de doação";
			} else if (!donation && order) {
				type="Encomendas";
			} else {
				return functions.returnErrorData(res, errors.err503, "Você deve enviar uma intenção de doação ou um pedido");
			}

			let nombres = first_name.trim().split(' ');
            let apellidos = last_name.trim().split(' ');

            for (let i=0; i < nombres.length; i++) {
                nombres[i] = functions.firstToUpper(nombres[i].toLowerCase());
            }

            for (let i=0; i < apellidos.length; i++) {
                apellidos[i] = functions.firstToUpper(apellidos[i].toLowerCase());
            }

			if (client != null) {
				// actualizar
				let client2 = await db.oneOrNone("UPDATE clients SET first_name=${first_name}, "+
				"last_name=${last_name}, sex=${sex}, phone=${phone}, updated_at=${date}, "+
				"birth_date=${birth_date}, cpf=${cpf}, cep=${cep}, state=${state}, city=${city}, "+
				"urbanization=${urbanization}, address=${address}, complement=${complement}, "+
				"number=${number}, type=${type}, attended=${false} WHERE id=${id} RETURNING *", {
					id: client.id,
					first_name: nombres.join(' '),
					last_name: apellidos.join(' '),
					sex: sex ? sex : '',
					phone: phone ? String(phone).trim() : '',
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
					type: type,
					false: false,
				});

				if(client2!=null) {
					req.body.client_id=client2.id;

					let clients_has_companies = await db.oneOrNone("SELECT * FROM clients_has_companies WHERE company_id=${company_id} AND client_id=${client_id}", {
						client_id: client2.id,
						company_id: req.body.company_id,
					});

					if(clients_has_companies==null) {
						await db.oneOrNone("INSERT INTO clients_has_companies (client_id, company_id) VALUES (${client_id}, ${company_id})", {
							client_id: client2.id,
							company_id: req.body.company_id,
						});
					}
					functions.insertHistoric(req, "Atualização", `Atualização de doador`, 0, true, 0, origin_data);
					functions.insertAudit(user_id, "Doação", "adicionar", `Doador ${email.trim().toLowerCase()} atualizado`, req);
				} else {
					return functions.returnErrorData(res, errors.err503, "O doador não pôde ser atualizado");
				}

				clientResult = client2;
			} else {
				// registrar
				let client2 = await db.oneOrNone("INSERT INTO clients (email, first_name, last_name, sex, " +
				"phone, created_at, updated_at, birth_date, cpf, cep, state, city, urbanization, "+
				"address, complement, number, type) VALUES (${email}, ${first_name}, ${last_name}, ${sex}, "+
				"${phone}, ${date}, ${date}, ${birth_date}, ${cpf}, ${cep}, ${state}, ${city}, ${urbanization}, "+
				"${address}, ${complement}, ${number}, ${type}) RETURNING *", {
					email: email.trim().toLowerCase(),
					first_name: nombres.join(' '),
					last_name: apellidos.join(' '),
					sex: sex ? sex : '',
					phone: phone ? String(phone).trim() : '',
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
					type: type,
				});
				if(client2!=null) {
					req.body.client_id=client2.id;
					await db.oneOrNone("INSERT INTO clients_has_companies (client_id, company_id) VALUES (${client_id}, ${company_id}) RETURNING *", {
						client_id: client2.id,
						company_id: req.body.company_id,
					});
					functions.insertHistoric(req, "Registro", `Registro de doador`, 0, true, 0, origin_data);
					functions.insertAudit(user_id, "Doação", "adicionar", `Doador ${email.trim().toLowerCase()} registrado`, req);
				} else {
					return functions.returnErrorData(res, errors.err503, "O doador não pôde ser registrado");
				}

				clientResult = client2;
			}

			if(type=='Intenção de doação') {
				// donacion 
				// tipo: Pontual, Mensal
				let donation2 = await db.oneOrNone("INSERT INTO donations (amount, user_id, campain_id, client_id, created_at, updated_at, confirmed, type) VALUES (${amount}, ${user_id}, ${campain_id}, ${client_id}, ${date}, ${date}, ${confirmed}, ${type}) RETURNING *", {
					amount: donation.amount,
					user_id,
					campain_id: 0,
					client_id: clientResult.id,
					date: functions.date(),
					confirmed: donation.confirmed,
					type: donation.donation_type.trim(),
				});

				if (donation2!=null) {
					functions.insertHistoric(req, "Intenção de doação", `Eu tento doar ${donation2.amount}`, donation2.id, true, 0, origin_data);
					functions.insertAudit(user_id, "Doação", "adicionar", `${clientResult.email.trim().toLowerCase()} tenta doar ${donation2.amount}`, req);
					functions.returnSuccessData(res, "Informação registrada");
				} else {
					functions.insertHistoric(req, "Intenção de doação", `Eu tento doar ${donation.amount}`, 0, false, 0, origin_data);
					return functions.returnErrorData(res, errors.err503, "Doador processado, a doação não pôde ser registrada");
				}
			} else if (type=="Baixe") {
				// pedido
				functions.insertHistoric(req, "Ordem", order.description.trim(), 0, true, 0, origin_data);
				functions.insertAudit(user_id, "Doação", "adicionar", `${clientResult.email.trim().toLowerCase()} ${order.description.trim()}`, req);
				functions.returnSuccessData(res, "Informação registrada");
			}
		} else {
			return functions.returnErrorData(res, errors.err401, 'O Api Key não pertence a nenhuma organização');
		}
	} catch (error) {
		return functions.errorBD(res, error, 0, "Doação", "adicionar", req);
	}
});

router.post('/local_add', upload.array(), async (req, res) => {
	let { campaign_id, company_id, user_id, client_id, codcad, person_type, identification_type, identification,
	ipca, payment_date, amount, method, card_type, card_number, expiration_month, expiration_year, 
	account_type, bank, agency, account_number, monthly_year_payment } = req.body;

	try {
		if (!company_id) { functions.returnErrorData(res, errors.err401, 'A associação é obrigatória.'); return;}
		if (!person_type) { functions.returnErrorData(res, errors.err401, 'O tipo de pessoa é obrigatório.'); return;}
		if (!identification_type) { functions.returnErrorData(res, errors.err401, 'O tipo de identificação é obrigatório.'); return;}
		if (!identification) { functions.returnErrorData(res, errors.err401, 'A identificação é obrigatória.'); return;}
		if (!amount) { functions.returnErrorData(res, errors.err401, 'O quantidade é obrigatório.'); return;}
		if (!payment_date) { functions.returnErrorData(res, errors.err401, 'A data de pagamento é obrigatória.'); return;}
		if (!method) { functions.returnErrorData(res, errors.err401, 'O método é obrigatório.'); return;}
		if (!monthly_year_payment) { functions.returnErrorData(res, errors.err401, 'O mês e o ano do pagamento são obrigatórios.'); return;}
		
		let last4='';
		
		if (card_number) {
			last4 = card_number.trim().split('-');
		}
		
		let client = await db.oneOrNone("SELECT * FROM clients WHERE id=${id} AND status=${true}", {
			id: client_id,
			true: true,
		});
		
		// donacion 
		// tipo: Pontual, Mensal
		let donation = await db.oneOrNone("INSERT INTO donations (amount, user_id, campain_id, client_id, created_at, updated_at, confirmed, type, company_id, codcad, ipca, payment_date, method, person_type, identification_type, identification, card_type, card_number, expired_month, expired_year, last_four, account_type, bank, agency, account_number, monthly_year_payment) VALUES (${amount}, ${user_id}, ${campain_id}, ${client_id}, ${date}, ${date}, ${confirmed}, ${type}, ${company_id}, ${codcad}, ${ipca}, ${payment_date}, ${method}, ${person_type}, ${identification_type}, ${identification}, ${card_type}, ${card_number}, ${expired_month}, ${expired_year}, ${last_four}, ${account_type}, ${bank}, ${agency}, ${account_number}, ${monthly_year_payment}) RETURNING *", {
			amount: parseFloat(amount).toFixed(2),
			user_id,
			campain_id: campaign_id,
			client_id,
			date: functions.date(),
			confirmed: true,
			type: 'Mensal',
			company_id, 
			codcad: codcad ? codcad.trim() : '',
			ipca,
			payment_date,
			method,
			person_type,
			identification_type,
			identification: identification.trim(),
			card_type: card_type ? functions.encrypt(String(card_type)) : '', // encriptar
			card_number: card_number ? functions.encrypt(String(card_number).trim()) : '', // encriptar
			expired_month: expiration_month ? functions.encrypt(String(expiration_month).trim()) : '', // encriptar
			expired_year: expiration_year ? functions.encrypt(String(expiration_year).trim()) : '', // encriptar
			last_four: last4 ? last4[3] : '',
			account_type: account_type ? functions.encrypt(String(account_type)) : '', // encriptar
			bank: bank ? functions.encrypt(String(bank).trim()) : '', // encriptar
			agency: agency ? functions.encrypt(String(agency).trim()) : '', // encriptar
			account_number: account_number ? functions.encrypt(String(account_number).trim()) : '', // encriptar REVIENTA CON 123456, 1234567 y 123412341234
			monthly_year_payment,
		});

		if (donation!=null) {
			functions.insertHistoric(req, "Doação", `Doação de ${donation.amount}`, donation.id, true, campaign_id, functions.origin_data);
			functions.insertAudit(user_id, "Doação", "adicionar", `${client.email.trim().toLowerCase()} doou ${donation.amount}`, req);
			functions.returnSuccessData(res, "Doação registrada");
		} else {
			functions.insertHistoric(req, "Doação", `Doação de ${parseFloat(amount).toFixed(2)}`, 0, false, campaign_id, functions.origin_data);
			return functions.returnErrorData(res, errors.err503, "A doação não pôde ser registrada, tente novamente");
		}
	
	} catch (error) {
		return functions.errorBD(res, error, user_id, "Doação", "adicionar local", req);
	}
});

router.get('/dashboard/:code/:first_date/:last_date/:user_id', upload.array(), async (req, res) => {
	let { code, first_date, last_date, user_id } = req.params;

	try {
		
		if (code == 'customized') {
			first_date = `${first_date} 00:00:00`;
			last_date = `${last_date} 23:59:59`;
		} else {
			first_date = functions.filterDateToQuery(code);
			last_date = functions.date();
		}

		let totalDeDonaciones=0, montoDeTotalDeDonaciones=0, tarjeta=0, bancaria=0, 
		asignados=0, noAsignados=0, asociaciones=[], usuarios=[];
		
		let donations = await db.manyOrNone("SELECT d.*, a.name AS company_name, u.email FROM donations d, companies a, users u WHERE d.method IN (${tarjeta}, ${domiciliacionBancaria}) AND d.status=${true} AND a.status=${true} AND u.status=${true} AND d.company_id=a.id AND d.user_id=u.id AND d.canceled=${false} AND d.created_at BETWEEN ${first_date} AND ${last_date} ORDER BY d.id DESC", {
			true: true,
			tarjeta: 'Cartão',
			domiciliacionBancaria: 'Conta',
			first_date,
			last_date,
			false: false,
		});

		for (let i = 0; i < donations.length; i++) {
			totalDeDonaciones = totalDeDonaciones + 1; // contador de donaciones
			montoDeTotalDeDonaciones = montoDeTotalDeDonaciones + donations[i].amount; // sumatoria de montos

			if (donations[i].method=='Cartão') {
				tarjeta = tarjeta + 1;
			} else if (donations[i].method=='Conta') {
				bancaria = bancaria + 1;
			}

			// ASOCIACIONES
			if (asociaciones.length>0) {
				let existe=false;

				for (let j = 0; j < asociaciones.length; j++) {
					if (asociaciones[j].company_name == donations[i].company_name) { // ya existe, suma
						existe=true;
						asociaciones[j].cantidadDeDonaciones = asociaciones[j].cantidadDeDonaciones + 1; // contador de donaciones por asociacion
						asociaciones[j].valorDeDonaciones = asociaciones[j].valorDeDonaciones + donations[i].amount; // sumatoria de montos por asociacion
					}
				}

				if (existe==false) { // no existe la asociacion, guardala
					let json = {
						company_name: donations[i].company_name, // nombre asociacion
						cantidadDeDonaciones: 1, // contador de donaciones por asociacion
						valorDeDonaciones: donations[i].amount, // sumatoria de montos por asociacion
					}
					asociaciones.push(json);
				}
			} else { // las asociaciones estan vacias, guarda la primera
				let json = {
					company_name: donations[i].company_name, // nombre asociacion
					cantidadDeDonaciones: 1, // contador de donaciones por asociacion
					valorDeDonaciones: donations[i].amount, // sumatoria de montos por asociacion
				}
				asociaciones.push(json);
			}

			// USUARIOS
			if (usuarios.length>0) {
				let existe=false;

				for (let j = 0; j < usuarios.length; j++) {
					if (usuarios[j].email == donations[i].email) { // ya existe, suma
						existe=true;
						usuarios[j].cantidadDeDonaciones = usuarios[j].cantidadDeDonaciones + 1; // contador de donaciones por usuario
						usuarios[j].valorDeDonaciones = usuarios[j].valorDeDonaciones + donations[i].amount; // sumatoria de montos por usuario
					}
				}

				if (existe==false) { // no existe el usuario, guardala
					let json = {
						email: donations[i].email, // correo de usuario
						cantidadDeDonaciones: 1, // contador de donaciones por usuario
						valorDeDonaciones: donations[i].amount, // sumatoria de montos por usuario
					}
					usuarios.push(json);
				}
			} else { // los usuarios estan vacias, guarda el primero
				let json = {
					email: donations[i].email, // correo de usuario
					cantidadDeDonaciones: 1, // contador de donaciones por usuario
					valorDeDonaciones: donations[i].amount, // sumatoria de montos por usuario
				}
				usuarios.push(json);
			}
		}

		let clients = await db.manyOrNone("SELECT * FROM clients WHERE status=${true} AND created_at BETWEEN ${first_date} AND ${last_date} ORDER BY id DESC", {
			true: true,
			first_date,
			last_date,
		});

		for (let i = 0; i < clients.length; i++) {
			if(clients[i].assigned == true) {
				asignados = asignados + 1;
			} else {
				noAsignados = noAsignados + 1;
			}
			
		}

		asociaciones.forEach(element => {
			element.valorDeDonaciones=parseFloat(element.valorDeDonaciones).toFixed(2);
		});

		usuarios.forEach(element => {
			element.valorDeDonaciones=parseFloat(element.valorDeDonaciones).toFixed(2);
		});
		
		functions.returnSuccessData(res, {
			totalDeDonaciones: totalDeDonaciones,
			montoDeTotalDeDonaciones: parseFloat(montoDeTotalDeDonaciones).toFixed(2),
			tarjeta: tarjeta,
			bancaria: bancaria,
			asignados: asignados,
			noAsignados: noAsignados,
			asociaciones: asociaciones,
			usuarios: usuarios,
		});
	
	} catch (error) {
		return functions.errorBD(res, error, user_id, "Doação", "dashboard", req);
	}
});

router.get('/reports_by_user/:user_to_find/:code/:first_date/:last_date/:user_id', upload.array(), async (req, res) => {
	let { code, first_date, last_date, user_id, user_to_find } = req.params;

	try {
		
		if (code == 'customized') {
			first_date = `${first_date} 00:00:00`;
			last_date = `${last_date} 23:59:59`;
		} else {
			first_date = functions.filterDateToQuery(code);
			last_date = functions.date();
		}

		let totalDeDonaciones=0, montoDeTotalDeDonaciones=0, tarjeta=0, bancaria=0, asociaciones=[];
		
		let donations = await db.manyOrNone("SELECT c.id AS client_id, c.email, c.first_name, c.last_name, c.sex, c.phone, c.birth_date, c.cpf, c.cep, c.state, c.city, c.urbanization, c.address, c.complement, c.number, c.type, d.id AS donation_id, d.amount, d.created_at, d.type AS donation_type, d.codcad, d.payment_date, d.method, d.person_type, d.identification_type, d.identification, d.card_type, d.card_number, d.expired_month, d.expired_year, d.account_type, d.bank, d.agency, d.account_number, d.monthly_year_payment, a.name AS company_name FROM donations d, companies a, users u, clients c WHERE d.method IN (${tarjeta}, ${domiciliacionBancaria}) AND d.status=${true} AND a.status=${true} AND u.status=${true} AND c.status=${true} AND d.company_id=a.id AND d.user_id=u.id AND d.canceled=${false} AND d.created_at BETWEEN ${first_date} AND ${last_date} AND u.id=${user_id} AND d.client_id=c.id ORDER BY d.id DESC", {
			true: true,
			tarjeta: 'Cartão',
			domiciliacionBancaria: 'Conta',
			first_date,
			last_date,
			user_id: user_to_find,
			false: false,
		});

		for (let i = 0; i < donations.length; i++) {
			totalDeDonaciones = totalDeDonaciones + 1; // contador de donaciones
			montoDeTotalDeDonaciones = montoDeTotalDeDonaciones + donations[i].amount; // sumatoria de montos

			if (donations[i].method=='Cartão') {
				tarjeta = tarjeta + 1;
			} else if (donations[i].method=='Conta') {
				bancaria = bancaria + 1;
			}

			// ASOCIACIONES
			if (asociaciones.length>0) {
				let existe=false;

				for (let j = 0; j < asociaciones.length; j++) {
					if (asociaciones[j].company_name == donations[i].company_name) { // ya existe, suma
						existe=true;
						asociaciones[j].cantidadDeDonaciones = asociaciones[j].cantidadDeDonaciones + 1; // contador de donaciones por asociacion
						asociaciones[j].valorDeDonaciones = asociaciones[j].valorDeDonaciones + donations[i].amount; // sumatoria de montos por asociacion
					}
				}

				if (existe==false) { // no existe la asociacion, guardala
					let json = {
						company_name: donations[i].company_name, // nombre asociacion
						cantidadDeDonaciones: 1, // contador de donaciones por asociacion
						valorDeDonaciones: donations[i].amount, // sumatoria de montos por asociacion
					}
					asociaciones.push(json);
				}
			} else { // las asociaciones estan vacias, guarda la primera
				let json = {
					company_name: donations[i].company_name, // nombre asociacion
					cantidadDeDonaciones: 1, // contador de donaciones por asociacion
					valorDeDonaciones: donations[i].amount, // sumatoria de montos por asociacion
				}
				asociaciones.push(json);
			}
		}

		asociaciones.forEach(element => {
			element.valorDeDonaciones=parseFloat(element.valorDeDonaciones).toFixed(2);
		});

		if (donations != null && donations.length > 0) {
            for (let i = 0; i < donations.length; i++) {
                donations[i].card_type = donations[i].card_type ? functions.decrypt(donations[i].card_type) : '';
                donations[i].card_number = donations[i].card_number ? functions.decrypt(donations[i].card_number) : '';
                donations[i].expired_month = donations[i].expired_month ? functions.decrypt(donations[i].expired_month) : '';
                donations[i].expired_year = donations[i].expired_year ? functions.decrypt(donations[i].expired_year) : '';
                donations[i].account_type = donations[i].account_type ? functions.decrypt(donations[i].account_type) : '';
                donations[i].bank = donations[i].bank ? functions.decrypt(donations[i].bank) : '';
                donations[i].agency = donations[i].agency ? functions.decrypt(donations[i].agency) : '';
                donations[i].account_number = donations[i].account_number ? functions.decrypt(donations[i].account_number) : '';                
            }
		}
		
		functions.returnSuccessData(res, {
			totalDeDonaciones,
			montoDeTotalDeDonaciones: parseFloat(montoDeTotalDeDonaciones).toFixed(2),
			tarjeta,
			bancaria,
			asociaciones,
			donations,
		});
	
	} catch (error) {
		return functions.errorBD(res, error, user_id, "Doação", "reports by user", req);
	}
});

module.exports = router;