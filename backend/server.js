
require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');
const mysql = require('mysql2/promise');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
const MYSQL_HOST = process.env.MYSQL_HOST || '127.0.0.1';
const MYSQL_PORT = Number(process.env.MYSQL_PORT || 3306);
const MYSQL_USER = process.env.MYSQL_USER || 'root';
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD || '';
const MYSQL_DATABASE = process.env.MYSQL_DATABASE || 'cineflex_db';

if (!JWT_SECRET) {
  throw new Error('Falta JWT_SECRET en el archivo .env');
}

if (!/^[a-zA-Z0-9_]+$/.test(MYSQL_DATABASE)) {
  throw new Error('MYSQL_DATABASE solo puede contener letras, numeros y guion bajo');
}

app.use(helmet());
app.use(morgan('dev'));
app.use(cors());
app.use(express.json());

const usuarioDemo = {
  id: 1,
  nombre: 'Cliente CineFlex',
  email: 'cliente@cineflex.com',
  passwordHash: bcrypt.hashSync('CineFlex123!', 10)
};

const intentos = new Map();
const MAX_INTENTOS = 3;
const BLOQUEO_MS = 60000;

const peliculas = [
  {
    id: 1,
    titulo: 'La Ultima Galaxia',
    genero: 'Ciencia ficcion',
    duracion: 135,
    clasificacion: 'Todo publico',
    horarios: ['15:00', '18:00', '21:00'],
    precio: 15000
  },
  {
    id: 2,
    titulo: 'Misterio en la Oscuridad',
    genero: 'Suspenso',
    duracion: 110,
    clasificacion: 'Mayores de 12',
    horarios: ['16:00', '19:00'],
    precio: 18000
  },
  {
    id: 3,
    titulo: 'Aventuras en el Bosque',
    genero: 'Animacion',
    duracion: 95,
    clasificacion: 'Todo publico',
    horarios: ['14:00', '17:00'],
    precio: 12000
  }
];

const codigosAsientos = [
  'A1', 'A2', 'A3', 'A4',
  'B1', 'B2', 'B3', 'B4',
  'C1', 'C2', 'C3', 'C4'
];

const asientosOcupados = {
  1: new Set(['A1', 'B2']),
  2: new Set(['A3', 'C1']),
  3: new Set(['B4'])
};

let pool;

function verificarToken(req, res, next) {
  const authorization = req.headers.authorization || '';
  const partes = authorization.split(' ');

  if (
    partes.length !== 2 ||
    partes[0] !== 'Bearer' ||
    !partes[1]
  ) {
    return res.status(401).json({
      mensaje: 'Token no proporcionado'
    });
  }

  try {
    req.usuario = jwt.verify(partes[1], JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({
      mensaje: 'Token invalido o expirado'
    });
  }
}

function simularPago(tarjeta) {
  if (tarjeta === 'PRUEBA_APROBADA') {
    return {
      aprobado: true,
      codigo: 'PAGO_APROBADO'
    };
  }

  return {
    aprobado: false,
    codigo: 'PAGO_RECHAZADO'
  };
}

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    return res.status(200).json({
      estado: 'OK',
      mensaje: 'Servidor CineFlex funcionando correctamente',
      baseDeDatos: 'conectada'
    });
  } catch (error) {
    console.error('Error al verificar MySQL:', error.message);
    return res.status(503).json({
      estado: 'ERROR',
      mensaje: 'Base de datos no disponible'
    });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};

  if (
    typeof email !== 'string' ||
    typeof password !== 'string' ||
    !email.trim() ||
    !password
  ) {
    return res.status(400).json({
      mensaje: 'Correo y contraseña son obligatorios'
    });
  }

  const correo = email.trim().toLowerCase();

  const registro = intentos.get(correo) || {
    fallos: 0,
    bloqueadoHasta: 0
  };

  if (registro.bloqueadoHasta > Date.now()) {
    return res.status(423).json({
      mensaje: 'Cuenta bloqueada temporalmente'
    });
  }

  if (registro.bloqueadoHasta > 0) {
    registro.fallos = 0;
    registro.bloqueadoHasta = 0;
  }

  const credencialesValidas =
    correo === usuarioDemo.email &&
    bcrypt.compareSync(password, usuarioDemo.passwordHash);

  if (!credencialesValidas) {
    registro.fallos++;

    if (registro.fallos >= MAX_INTENTOS) {
      registro.bloqueadoHasta = Date.now() + BLOQUEO_MS;
      intentos.set(correo, registro);

      return res.status(423).json({
        mensaje: 'Cuenta bloqueada por 3 intentos fallidos'
      });
    }

    intentos.set(correo, registro);

    return res.status(401).json({
      mensaje: 'Credenciales incorrectas'
    });
  }

  intentos.delete(correo);

  const token = jwt.sign(
    {
      sub: String(usuarioDemo.id),
      email: usuarioDemo.email,
      rol: 'cliente'
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  return res.status(200).json({
    mensaje: 'Inicio de sesión exitoso',
    token,
    usuario: {
      id: usuarioDemo.id,
      nombre: usuarioDemo.nombre,
      email: usuarioDemo.email
    }
  });
});

app.get('/api/auth/me', verificarToken, (req, res) => {
  return res.status(200).json({
    mensaje: 'Acceso autorizado',
    usuario: req.usuario
  });
});

app.get('/api/cartelera', verificarToken, (req, res) => {
  return res.status(200).json({
    total: peliculas.length,
    peliculas
  });
});

app.get('/api/peliculas/:id/asientos', verificarToken, (req, res) => {
  const peliculaId = Number(req.params.id);
  const pelicula = peliculas.find(p => p.id === peliculaId);

  if (!pelicula) {
    return res.status(404).json({
      mensaje: 'Pelicula no encontrada'
    });
  }

  const ocupados = asientosOcupados[peliculaId];

  const asientos = codigosAsientos.map(codigo => ({
    codigo,
    disponible: !ocupados.has(codigo)
  }));

  const disponibles = asientos.filter(
    asiento => asiento.disponible
  ).length;

  return res.status(200).json({
    pelicula: pelicula.titulo,
    total: asientos.length,
    disponibles,
    ocupados: asientos.length - disponibles,
    asientos
  });
});

app.post('/api/reservas', verificarToken, async (req, res) => {
  const { peliculaId, asiento, horario, tarjeta } = req.body || {};

  if (
    !Number.isInteger(peliculaId) ||
    typeof asiento !== 'string' ||
    typeof horario !== 'string' ||
    typeof tarjeta !== 'string' ||
    !tarjeta.trim()
  ) {
    return res.status(400).json({
      mensaje: 'Datos de reserva incompletos o invalidos'
    });
  }

  const pelicula = peliculas.find(p => p.id === peliculaId);

  if (!pelicula) {
    return res.status(404).json({
      mensaje: 'Pelicula no encontrada'
    });
  }

  if (!pelicula.horarios.includes(horario)) {
    return res.status(400).json({
      mensaje: 'Horario no disponible'
    });
  }

  if (!codigosAsientos.includes(asiento)) {
    return res.status(400).json({
      mensaje: 'Asiento invalido'
    });
  }

  if (asientosOcupados[peliculaId].has(asiento)) {
    return res.status(409).json({
      mensaje: 'El asiento ya esta ocupado'
    });
  }

  const pago = simularPago(tarjeta);

  if (!pago.aprobado) {
    return res.status(402).json({
      mensaje: 'Pago rechazado por el banco simulado',
      codigo: pago.codigo
    });
  }

  const codigoTicket = `CF-${randomUUID().slice(0, 8).toUpperCase()}`;

  const ticket = {
    codigo: codigoTicket,
    peliculaId: pelicula.id,
    pelicula: pelicula.titulo,
    horario,
    asiento,
    precio: pelicula.precio,
    fechaReserva: new Date().toISOString(),
    usuarioId: req.usuario.sub,
    estado: 'CONFIRMADO'
  };

  try {
    await pool.execute(
      `INSERT INTO tickets
        (codigo, pelicula_id, pelicula, horario, asiento, precio, fecha_reserva, usuario_id, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ticket.codigo,
        ticket.peliculaId,
        ticket.pelicula,
        ticket.horario,
        ticket.asiento,
        ticket.precio,
        ticket.fechaReserva.slice(0, 23).replace('T', ' '),
        ticket.usuarioId,
        ticket.estado
      ]
    );
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        mensaje: 'El asiento ya esta ocupado'
      });
    }

    console.error('Error al guardar el ticket en MySQL:', error.message);
    return res.status(503).json({
      mensaje: 'No fue posible guardar la reserva'
    });
  }

  asientosOcupados[peliculaId].add(asiento);

  return res.status(201).json({
    mensaje: 'Reserva confirmada',
    ticket: {
      codigo: ticket.codigo,
      pelicula: ticket.pelicula,
      horario: ticket.horario,
      asiento: ticket.asiento,
      precio: ticket.precio,
      fechaReserva: ticket.fechaReserva,
      estado: ticket.estado
    }
  });
});

app.get('/api/reservas/:codigo', verificarToken, async (req, res) => {
  let ticket;

  try {
    const [tickets] = await pool.execute(
      `SELECT codigo, pelicula, horario, asiento, precio,
              DATE_FORMAT(fecha_reserva, '%Y-%m-%dT%H:%i:%s.000Z') AS fechaReserva,
              estado
       FROM tickets
       WHERE codigo = ? AND usuario_id = ?`,
      [req.params.codigo, req.usuario.sub]
    );
    ticket = tickets[0];
  } catch (error) {
    console.error('Error al consultar el ticket en MySQL:', error.message);
    return res.status(503).json({
      mensaje: 'No fue posible consultar el ticket'
    });
  }

  if (!ticket) {
    return res.status(404).json({
      mensaje: 'Ticket no encontrado'
    });
  }

  return res.status(200).json({
    ticket: {
      codigo: ticket.codigo,
      pelicula: ticket.pelicula,
      horario: ticket.horario,
      asiento: ticket.asiento,
      precio: ticket.precio,
      fechaReserva: ticket.fechaReserva,
      estado: ticket.estado
    }
  });
});

app.use(express.static(require('path').join(__dirname, '../frontend')));

app.use((req, res) => {
  return res.status(404).json({
    mensaje: 'Ruta no encontrada'
  });
});

async function inicializarBaseDeDatos() {
  const connection = await mysql.createConnection({
    host: MYSQL_HOST,
    port: MYSQL_PORT,
    user: MYSQL_USER,
    password: MYSQL_PASSWORD
  });

  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${MYSQL_DATABASE}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
  } finally {
    await connection.end();
  }

  pool = mysql.createPool({
    host: MYSQL_HOST,
    port: MYSQL_PORT,
    user: MYSQL_USER,
    password: MYSQL_PASSWORD,
    database: MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS tickets (
      codigo VARCHAR(16) PRIMARY KEY,
      pelicula_id INT NOT NULL,
      pelicula VARCHAR(150) NOT NULL,
      horario VARCHAR(5) NOT NULL,
      asiento VARCHAR(5) NOT NULL,
      precio INT NOT NULL,
      fecha_reserva DATETIME(3) NOT NULL,
      usuario_id VARCHAR(64) NOT NULL,
      estado VARCHAR(20) NOT NULL,
      UNIQUE KEY uq_ticket_asiento (pelicula_id, asiento)
    ) ENGINE=InnoDB
  `);

  const [tickets] = await pool.execute(
    'SELECT pelicula_id, asiento FROM tickets WHERE estado = ?',
    ['CONFIRMADO']
  );

  for (const ticket of tickets) {
    asientosOcupados[ticket.pelicula_id]?.add(ticket.asiento);
  }
}

async function iniciarServidor() {
  await inicializarBaseDeDatos();

  console.log('=====================================');
  console.log('CINEFLEX - BACKEND ACTIVO');
  console.log(`Servidor: http://localhost:${PORT}`);
  console.log('Seguridad: Helmet + JWT');
  console.log('Registro de peticiones: Morgan');
  console.log(`MySQL: conectado a ${MYSQL_DATABASE}`);
  console.log('Reservas y pagos simulados activos');
  console.log('=====================================');
  app.listen(PORT);
}

iniciarServidor().catch(error => {
  console.error('No se pudo iniciar CineFlex o conectar con MySQL:', error.message);
  process.exitCode = 1;
});
