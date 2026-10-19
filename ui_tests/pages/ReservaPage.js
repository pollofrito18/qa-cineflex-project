const { By, until, Select } = require('selenium-webdriver');

class ReservaPage {
  constructor(driver) {
    this.driver = driver;
  }

  async obtenerHorarios() {
    const opciones = await this.driver.findElements(By.css('#horario option'));
    return Promise.all(opciones.map(opcion => opcion.getAttribute('value')));
  }

  async seleccionarHorario(horario) {
    const selector = new Select(await this.driver.findElement(By.id('horario')));
    await selector.selectByValue(horario);
  }

  async esperarAsientos() {
    await this.driver.wait(async () => {
      const asientos = await this.driver.findElements(By.css('#asientos-grid .seat'));
      return asientos.length === 12;
    }, 10000);
  }

  async contarAsientos() {
    await this.esperarAsientos();
    const asientos = await this.driver.findElements(By.css('#asientos-grid .seat'));
    return asientos.length;
  }

  async asientoOcupado(codigo) {
    await this.esperarAsientos();
    const asiento = await this.driver.findElement(By.id(`asiento-${codigo}`));
    return !(await asiento.isEnabled());
  }

  async seleccionarAsientoDisponible() {
    await this.esperarAsientos();
    const asientos = await this.driver.findElements(By.css('#asientos-grid .seat'));

    for (const asiento of asientos) {
      if (await asiento.isEnabled()) {
        const codigo = await asiento.getText();
        await asiento.click();
        return codigo;
      }
    }

    throw new Error('No hay asientos disponibles');
  }

  async obtenerEtiquetaAsiento() {
    return this.driver.findElement(By.id('selected-seat-label')).getText();
  }

  async continuarAlPago() {
    await this.driver.findElement(By.id('continue-payment')).click();
  }

  async obtenerErrorReserva() {
    const error = await this.driver.findElement(By.id('reserva-error'));
    await this.driver.wait(async () => (await error.getText()).length > 0, 10000);
    return error.getText();
  }

  async reservaVisible() {
    return this.driver.findElement(By.id('reserva-view')).isDisplayed();
  }

  async pagoVisible() {
    return this.driver.findElement(By.id('pago-view')).isDisplayed();
  }

  async obtenerResumenPago() {
    return this.driver.findElement(By.id('payment-summary')).getText();
  }

  async seleccionarTarjeta(valor) {
    const selector = new Select(await this.driver.findElement(By.id('tarjeta')));
    await selector.selectByValue(valor);
  }

  async confirmarPago() {
    await this.driver.findElement(By.id('confirm-payment')).click();
  }

  async obtenerErrorPago() {
    const error = await this.driver.findElement(By.id('payment-error'));
    await this.driver.wait(async () => (await error.getText()).length > 0, 15000);
    return error.getText();
  }

  async obtenerTicket() {
    const vista = await this.driver.findElement(By.id('ticket-view'));
    await this.driver.wait(until.elementIsVisible(vista), 15000);

    return {
      codigo: await this.driver.findElement(By.id('ticket-code')).getText(),
      pelicula: await this.driver.findElement(By.id('ticket-movie')).getText(),
      asiento: await this.driver.findElement(By.id('ticket-seat')).getText(),
      estado: await this.driver.findElement(By.id('ticket-status')).getText()
    };
  }

  async volverACartelera() {
    await this.driver.findElement(By.id('back-home')).click();
    const vista = await this.driver.findElement(By.id('cartelera-view'));
    await this.driver.wait(until.elementIsVisible(vista), 15000);
  }
}

module.exports = ReservaPage;
