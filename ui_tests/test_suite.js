
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Builder } = require('selenium-webdriver');

const LoginPage = require('./pages/LoginPage');
const CarteleraPage = require('./pages/CarteleraPage');
const ReservaPage = require('./pages/ReservaPage');

test('Login correcto en CineFlex', { timeout: 120000 }, async () => {
  const driver = await new Builder().forBrowser('chrome').build();

  try {
    const login = new LoginPage(driver);

    await login.abrir();
    await login.iniciarSesion(
      'cliente@cineflex.com',
      'CineFlex123!'
    );

    const usuario = await login.obtenerNombreUsuario();

    assert.equal(usuario, 'Cliente CineFlex');
  } finally {
    await driver.quit();
  }
});

function pruebaConSesion(nombre, ejecutar) {
  test(nombre, { timeout: 120000 }, async () => {
    const driver = await new Builder().forBrowser('chrome').build();

    try {
      const login = new LoginPage(driver);

      await login.abrir();
      await login.iniciarSesion(
        'cliente@cineflex.com',
        'CineFlex123!'
      );

      const cartelera = new CarteleraPage(driver);

      await ejecutar(cartelera);
    } finally {
      await driver.quit();
    }
  });
}

pruebaConSesion('Cartelera contiene tres peliculas', async cartelera => {
  assert.equal(await cartelera.contarPeliculas(), 3);
});

pruebaConSesion('Cartelera muestra los titulos correctos', async cartelera => {
  const titulos = await cartelera.obtenerTitulos();

  assert.deepEqual(titulos, [
    'La Ultima Galaxia',
    'Misterio en la Oscuridad',
    'Aventuras en el Bosque'
  ]);
});

pruebaConSesion('Seleccionar pelicula 2 muestra su reserva', async cartelera => {
  await cartelera.seleccionarPelicula(2);

  assert.equal(
    await cartelera.obtenerTituloSeleccionado(),
    'Misterio en la Oscuridad'
  );
});

pruebaConSesion('Regresar desde reserva a cartelera', async cartelera => {
  await cartelera.seleccionarPelicula(1);
  await cartelera.volverACartelera();

  assert.equal(await cartelera.carteleraVisible(), true);
});

pruebaConSesion('Pelicula 1 ofrece tres horarios', async cartelera => {
  await cartelera.seleccionarPelicula(1);

  const reserva = new ReservaPage(cartelera.driver);

  assert.deepEqual(await reserva.obtenerHorarios(), [
    '15:00', '18:00', '21:00'
  ]);
});

pruebaConSesion('Pelicula 2 ofrece dos horarios', async cartelera => {
  await cartelera.seleccionarPelicula(2);

  const reserva = new ReservaPage(cartelera.driver);

  assert.deepEqual(await reserva.obtenerHorarios(), [
    '16:00', '19:00'
  ]);
});

pruebaConSesion('La sala contiene doce asientos', async cartelera => {
  await cartelera.seleccionarPelicula(1);

  const reserva = new ReservaPage(cartelera.driver);

  assert.equal(await reserva.contarAsientos(), 12);
});

pruebaConSesion('No permite seleccionar un asiento ocupado', async cartelera => {
  await cartelera.seleccionarPelicula(1);

  const reserva = new ReservaPage(cartelera.driver);

  assert.equal(await reserva.asientoOcupado('A1'), true);
});

pruebaConSesion('No permite continuar sin seleccionar asiento', async cartelera => {
  await cartelera.seleccionarPelicula(1);

  const reserva = new ReservaPage(cartelera.driver);

  await reserva.continuarAlPago();

  assert.equal(
    await reserva.obtenerErrorReserva(),
    'Selecciona un asiento disponible'
  );

  assert.equal(await reserva.reservaVisible(), true);
});

pruebaConSesion('Seleccionar asiento actualiza la etiqueta', async cartelera => {
  await cartelera.seleccionarPelicula(3);

  const reserva = new ReservaPage(cartelera.driver);

  const asiento = await reserva.seleccionarAsientoDisponible();

  assert.equal(
    await reserva.obtenerEtiquetaAsiento(),
    `Asiento seleccionado: ${asiento}`
  );
});

pruebaConSesion('El resumen de pago muestra la reserva correcta', async cartelera => {
  await cartelera.seleccionarPelicula(2);

  const reserva = new ReservaPage(cartelera.driver);

  const asiento = await reserva.seleccionarAsientoDisponible();

  await reserva.continuarAlPago();

  const resumen = await reserva.obtenerResumenPago();

  assert.equal(await reserva.pagoVisible(), true);
  assert.ok(resumen.includes('Misterio en la Oscuridad'));
  assert.ok(resumen.includes(`Asiento ${asiento}`));
  assert.ok(resumen.includes('18.000 COP'));
});

pruebaConSesion('El banco simulado rechaza tarjeta falsa', async cartelera => {
  await cartelera.seleccionarPelicula(1);

  const reserva = new ReservaPage(cartelera.driver);

  await reserva.seleccionarAsientoDisponible();
  await reserva.continuarAlPago();
  await reserva.seleccionarTarjeta('TARJETA_FALSA');
  await reserva.confirmarPago();

  assert.equal(
    await reserva.obtenerErrorPago(),
    'Pago rechazado por el banco simulado'
  );

  assert.equal(await reserva.pagoVisible(), true);
});

pruebaConSesion('Pago aprobado genera ticket confirmado', async cartelera => {
  await cartelera.seleccionarPelicula(3);

  const reserva = new ReservaPage(cartelera.driver);

  const asiento = await reserva.seleccionarAsientoDisponible();

  await reserva.continuarAlPago();
  await reserva.seleccionarTarjeta('PRUEBA_APROBADA');
  await reserva.confirmarPago();

  const ticket = await reserva.obtenerTicket();

  assert.match(ticket.codigo, /^CF-[0-9A-F]{8}$/);
  assert.equal(ticket.pelicula, 'Aventuras en el Bosque');
  assert.equal(ticket.asiento, `Asiento: ${asiento}`);
  assert.equal(ticket.estado, 'CONFIRMADO');

  await reserva.volverACartelera();

  assert.equal(await cartelera.carteleraVisible(), true);
});

pruebaConSesion('Cambiar horario actualiza el resumen de pago', async cartelera => {
  await cartelera.seleccionarPelicula(1);

  const reserva = new ReservaPage(cartelera.driver);

  await reserva.seleccionarHorario('21:00');

  const asiento = await reserva.seleccionarAsientoDisponible();

  await reserva.continuarAlPago();

  const resumen = await reserva.obtenerResumenPago();

  assert.ok(resumen.includes('21:00'));
  assert.ok(resumen.includes(`Asiento ${asiento}`));
});

pruebaConSesion('El titulo Cartelera aparece correctamente en el DOM', async cartelera => {
  const titulo = await cartelera.obtenerTituloCartelera();

  assert.equal(titulo, 'Cartelera');
  assert.equal(await cartelera.carteleraVisible(), true);
});

test('Cerrar sesion impide regresar a la cartelera con Atras', { timeout: 120000 }, async () => {
  const driver = await new Builder().forBrowser('chrome').build();

  try {
    const login = new LoginPage(driver);

    await login.abrir();
    await login.iniciarSesion(
      'cliente@cineflex.com',
      'CineFlex123!'
    );

    const cartelera = new CarteleraPage(driver);

    assert.equal(await cartelera.carteleraVisible(), true);

    await driver.executeScript(
      "window.location.hash = '#cartelera-prueba'"
    );

    await login.cerrarSesion();

    assert.equal(await login.loginVisible(), true);
    assert.equal(await cartelera.carteleraVisible(), false);

    await driver.navigate().back();

    assert.equal(await login.loginVisible(), true);
    assert.equal(await cartelera.carteleraVisible(), false);
  } finally {
    await driver.quit();
  }
});

test('Bloqueo de cuenta despues de tres intentos fallidos', { timeout: 120000 }, async () => {
  const driver = await new Builder().forBrowser('chrome').build();

  try {
    const login = new LoginPage(driver);
    const cartelera = new CarteleraPage(driver);

    await login.abrir();

    const correo = 'cliente@cineflex.com';
    const claveIncorrecta = 'ClaveIncorrecta123!';

    const mensajesEsperados = [
      'Credenciales incorrectas',
      'Credenciales incorrectas',
      'Cuenta bloqueada por 3 intentos fallidos'
    ];

    for (const mensajeEsperado of mensajesEsperados) {
      await login.enviarCredenciales(
        correo,
        claveIncorrecta
      );

      const mensaje = await login.obtenerErrorLogin();

      assert.equal(mensaje, mensajeEsperado);
      assert.equal(await login.loginVisible(), true);
    }

    await login.enviarCredenciales(
      correo,
      'CineFlex123!'
    );

    const mensajeBloqueo = await login.obtenerErrorLogin();

    assert.equal(
      mensajeBloqueo,
      'Cuenta bloqueada temporalmente'
    );

    assert.equal(await login.loginVisible(), true);
    assert.equal(await cartelera.carteleraVisible(), false);
  } finally {
    await driver.quit();
  }
});
