var express = require('express');
var app = express();
var server = require('http').Server(app);
var bodyParser = require('body-parser');
var cors = require('cors');
var functions = require('./config/helperFunctions.js');
const db = require('./config/db.js').db;
var io = require('socket.io')(server);
var cron = require('node-cron');

// Controllers
let authController = require('./controllers/auth.js');
let userController = require('./controllers/user.js');
let companyController = require('./controllers/company.js');
let roleController = require('./controllers/role.js');
let permissionController = require('./controllers/permission.js');
let campainsController = require('./controllers/campains.js');
let call_statusController = require('./controllers/call_status.js');
let clientController = require('./controllers/client.js');
let contactabilityController = require('./controllers/contactability.js');
let cancelationsController = require('./controllers/cancelations.js');
let donationController = require('./controllers/donation.js');
let auditController = require('./controllers/audit.js');
var exportationController = require('./controllers/exportation.js');

app.enable('trust proxy');
app.use('/public', express.static(__dirname+'/public'));
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.use(bodyParser.json()); // for parsing application/json
app.use(cors()); //server query allow

console.log("--------------NODE----------------");
app.all('*', function (req, res, next) {
  functions.printRoute(req);
  next();
});

app.get('/', function (req, res) {
  res.send('<h1>No momento, esta página não está ativa</h1>');
});

app.use('/auth', authController);
app.use('/user', userController);
app.use('/company', companyController);
app.use('/role', roleController);
app.use('/permission', permissionController);
app.use('/campain', campainsController);
app.use('/callstatus', call_statusController);
app.use('/client', clientController);
app.use('/contactability', contactabilityController);
app.use('/cancelations', cancelationsController);
app.use('/donation', donationController);
app.use('/audit', auditController);
app.use('/exportation', exportationController);

io.on('connection', (socket) => {
  console.log('socket.io: connect');

  /*socket.on('benefactor', (userId) => {
    db.manyOrNone("SELECT * FROM historic h, donations d WHERE h.user_id=${user_id} AND h.event=${event} AND h.status=${true} AND h.date >= ${fecha} AND h.reference_id=d.id AND d.status=${true} AND d.confirmed=${true}",{
      user_id: userId,
      fecha: functions.filterDateToQuery('Tmt'),
      event: 'Doação',
      true: true,
    }).then(data => {
      socket.emit('benefactorResult', data.length);
    }).catch(error => {
      console.log(`error en el socket benefactor: ${error}`);
      socket.emit('benefactorResult', 0);
    });
  });*/

  socket.on('contacts', (userId) => {
    db.manyOrNone("SELECT * FROM historic h, clients c, campains ca WHERE h.user_id=${user_id} AND h.event=${event} AND h.status=${true} AND h.date >= ${fecha} AND c.status=${true} AND c.id=h.client_id AND h.campain_id=ca.id AND ca.status=${true}",{
      user_id: userId,
      true: true,
      fecha: functions.filterDateToQuery('Tmt'),
      event: 'Resultado do contato',
    }).then(data => {
      socket.emit('contactsResult', data.length);
    }).catch(error => {
      console.log(`error en el socket contacts: ${error}`);
      socket.emit('contactsResult', 0);
    });
  });

  socket.on('myLeads', (userId) => {
    db.manyOrNone("SELECT c.*, h.date, h.origin_data FROM clients c, clients_has_users cu, historic h WHERE c.status=${true} AND c.assigned=${true} AND cu.user_id=${user_id} AND c.id=cu.client_id AND cu.active=${true} AND h.event=${event} AND h.description=${description} AND h.status=${true} AND c.id=h.client_id",{
      user_id: userId,
      true: true,
      event: 'Registro',
      description: 'Registro de doador'
    }).then(data => {
      socket.emit('myLeadsResult', data.length);
    }).catch(error => {
      console.log(`error en el socket myLeads: ${error}`);
      socket.emit('myLeadsResult', 0);
    });
  });

  socket.on('toContact', (userId) => {
    db.oneOrNone("SELECT monthly_goals FROM users WHERE id=${id} AND status=${true}",{
      id: userId,
      true: true,
    }).then(data => {
      if (data.monthly_goals != null) {
        db.manyOrNone("SELECT * FROM historic h, clients c, campains ca WHERE h.user_id=${user_id} AND h.event=${event} AND h.status=${true} AND h.date >= ${fecha} AND c.status=${true} AND c.id=h.client_id AND h.campain_id=ca.id AND ca.status=${true}",{
          user_id: userId,
          true: true,
          fecha: functions.filterDateToQuery('Tmt'),
          event: 'Resultado do contato',
        }).then(data2 => {
          var toContact = data.monthly_goals - data2.length;

          if (data2.length >= data.monthly_goals) {
            toContact = 0;
          }
          socket.emit('toContactResult', {toContact: toContact, monthlyGoals: data.monthly_goals});
        }).catch(error => {
          console.log(`error en el socket toContact: ${error}`);
          socket.emit('toContactResult', {toContact: 0, monthlyGoals: 0});
        });
      } else {
        socket.emit('toContactResult', {toContact: 0, monthlyGoals: 0});
      }
    }).catch(error => {
      console.log(`error en el socket toContact: ${error}`);
      socket.emit('toContactResult', {toContact: 0, monthlyGoals: 0});
    }); 
  });

  socket.on('disconnect', (userId) => {
    console.log('socket.io: disconnect');
  });
});

// cron.schedule('0 0 16 31 1 4', functions.runMaintenanceScript); // segundos(0-59) minutos(0-59) horas(0-23) diaDelMes(1-31) mes(1-12) diaDeLaSemana(7,0-6) -> 7 y 0 es domingo

server.listen(3001, () => {
  console.log("server on port 3001");
});
