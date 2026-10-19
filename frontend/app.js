
let token = null;
let peliculas = [];
let peliculaSeleccionada = null;
let asientoSeleccionado = null;

const vistas = [
  'login-view',
  'cartelera-view',
  'reserva-view',
  'pago-view',
  'ticket-view'
];

function mostrarVista(id) {
  vistas.forEach(vista => {
    document.getElementById(vista).hidden = vista !== id;
  });
}

function mostrarError(id, mensaje) {
  document.getElementById(id).textContent = mensaje;
}

async function solicitar(ruta, opciones = {}) {
  const headers = { ...opciones.headers };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (opciones.body) {
    headers['Content-Type'] = 'application/json';
  }

  const respuesta = await fetch(ruta, {
    ...opciones,
    headers
  });

  const datos = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(datos.mensaje || 'Error de solicitud');
  }

  return datos;
}

async function cargarCartelera() {
  const datos = await solicitar('/api/cartelera');
  peliculas = datos.peliculas;

  const contenedor = document.getElementById('movies-grid');
  contenedor.replaceChildren();

  peliculas.forEach(pelicula => {
    const tarjeta = document.createElement('article');
    tarjeta.className = 'movie-card';

    const poster = document.createElement('div');
    poster.className = 'movie-poster';
    poster.textContent = '🎬';

    const titulo = document.createElement('h3');
    titulo.textContent = pelicula.titulo;

    const genero = document.createElement('p');
    genero.textContent = pelicula.genero;

    const precio = document.createElement('p');
    precio.textContent =
      `$${pelicula.precio.toLocaleString('es-CO')} COP`;

    const boton = document.createElement('button');
    boton.id = `pelicula-${pelicula.id}`;
    boton.textContent = 'Seleccionar película';

    boton.addEventListener('click', () => {
      seleccionarPelicula(pelicula);
    });

    tarjeta.append(poster, titulo, genero, precio, boton);
    contenedor.appendChild(tarjeta);
  });

  mostrarVista('cartelera-view');
}

async function seleccionarPelicula(pelicula) {
  peliculaSeleccionada = pelicula;
  asientoSeleccionado = null;

  mostrarError('reserva-error', '');

  document.getElementById('selected-movie-title').textContent =
    pelicula.titulo;

  document.getElementById('selected-seat-label').textContent =
    'Ningún asiento seleccionado';

  const horarios = document.getElementById('horario');
  horarios.replaceChildren();

  pelicula.horarios.forEach(hora => {
    const opcion = document.createElement('option');
    opcion.value = hora;
    opcion.textContent = hora;
    horarios.appendChild(opcion);
  });

  try {
    const datos = await solicitar(
      `/api/peliculas/${pelicula.id}/asientos`
    );

    const contenedor = document.getElementById('asientos-grid');
    contenedor.replaceChildren();

    datos.asientos.forEach(asiento => {
      const boton = document.createElement('button');
      boton.id = `asiento-${asiento.codigo}`;
      boton.className = 'seat';
      boton.textContent = asiento.codigo;
      boton.disabled = !asiento.disponible;

      if (!asiento.disponible) {
        boton.classList.add('occupied');
      }

      boton.addEventListener('click', () => {
        document.querySelectorAll('.seat').forEach(elemento => {
          elemento.classList.remove('selected');
        });

        boton.classList.add('selected');
        asientoSeleccionado = asiento.codigo;

        document.getElementById('selected-seat-label').textContent =
          `Asiento seleccionado: ${asiento.codigo}`;
      });

      contenedor.appendChild(boton);
    });

    mostrarVista('reserva-view');
  } catch (error) {
    alert(error.message);
  }
}

document.getElementById('login-form').addEventListener(
  'submit',
  async evento => {
    evento.preventDefault();

    mostrarError('login-error', '');

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
      const datos = await solicitar('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      token = datos.token;

      document.getElementById('user-name').textContent =
        datos.usuario.nombre;

      document.getElementById('logout-button').hidden = false;

      await cargarCartelera();
    } catch (error) {
      mostrarError('login-error', error.message);
    }
  }
);

document.getElementById('continue-payment').addEventListener(
  'click',
  () => {
    if (!asientoSeleccionado) {
      mostrarError(
        'reserva-error',
        'Selecciona un asiento disponible'
      );
      return;
    }

    const horario = document.getElementById('horario').value;

    document.getElementById('payment-summary').textContent =
      `${peliculaSeleccionada.titulo} | ${horario} | ` +
      `Asiento ${asientoSeleccionado} | ` +
      `$${peliculaSeleccionada.precio.toLocaleString('es-CO')} COP`;

    mostrarError('payment-error', '');
    mostrarVista('pago-view');
  }
);

document.getElementById('payment-form').addEventListener(
  'submit',
  async evento => {
    evento.preventDefault();

    mostrarError('payment-error', '');

    const boton = document.getElementById('confirm-payment');
    boton.disabled = true;

    const datosReserva = {
      peliculaId: peliculaSeleccionada.id,
      asiento: asientoSeleccionado,
      horario: document.getElementById('horario').value,
      tarjeta: document.getElementById('tarjeta').value
    };

    try {
      const resultado = await solicitar('/api/reservas', {
        method: 'POST',
        body: JSON.stringify(datosReserva)
      });

      const ticket = resultado.ticket;

      document.getElementById('ticket-code').textContent =
        ticket.codigo;

      document.getElementById('ticket-movie').textContent =
        ticket.pelicula;

      document.getElementById('ticket-time').textContent =
        `Horario: ${ticket.horario}`;

      document.getElementById('ticket-seat').textContent =
        `Asiento: ${ticket.asiento}`;

      document.getElementById('ticket-price').textContent =
        `Precio: $${ticket.precio.toLocaleString('es-CO')} COP`;

      document.getElementById('ticket-status').textContent =
        ticket.estado;

      mostrarVista('ticket-view');
    } catch (error) {
      mostrarError('payment-error', error.message);
    } finally {
      boton.disabled = false;
    }
  }
);

document.getElementById('logout-button').addEventListener(
  'click',
  () => {
    token = null;
    peliculas = [];
    peliculaSeleccionada = null;
    asientoSeleccionado = null;

    document.getElementById('user-name').textContent = '';
    document.getElementById('logout-button').hidden = true;
    document.getElementById('login-password').value = '';

    mostrarError('login-error', '');
    mostrarVista('login-view');
  }
);

document.getElementById('back-cartelera').addEventListener(
  'click',
  () => {
    mostrarVista('cartelera-view');
  }
);

document.getElementById('back-reserva').addEventListener(
  'click',
  () => {
    mostrarVista('reserva-view');
  }
);

document.getElementById('back-home').addEventListener(
  'click',
  async () => {
    try {
      await cargarCartelera();
    } catch (error) {
      alert(error.message);
    }
  }
);

mostrarVista('login-view');
