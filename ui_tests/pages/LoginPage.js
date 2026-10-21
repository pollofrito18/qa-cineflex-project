
const { By, until } = require('selenium-webdriver');

class LoginPage {
  constructor(driver) {
    this.driver = driver;
  }

  async abrir() {
    await this.driver.get('http://localhost:3000');

    await this.driver.wait(
      until.elementLocated(By.id('login-email')),
      10000
    );
  }

  async enviarCredenciales(email, password) {
    const correo = await this.driver.findElement(
      By.id('login-email')
    );

    const clave = await this.driver.findElement(
      By.id('login-password')
    );

    await correo.clear();
    await correo.sendKeys(email);

    await clave.clear();
    await clave.sendKeys(password);

    await this.driver.findElement(
      By.id('login-submit')
    ).click();
  }

  async iniciarSesion(email, password) {
    await this.enviarCredenciales(email, password);

    await this.driver.wait(async () => {
      const cartelera = await this.driver.findElement(
        By.id('cartelera-view')
      );

      return cartelera.isDisplayed();
    }, 15000);
  }

  async obtenerNombreUsuario() {
    return this.driver.findElement(
      By.id('user-name')
    ).getText();
  }

  async cerrarSesion() {
    await this.driver.findElement(
      By.id('logout-button')
    ).click();
  }

  async loginVisible() {
    return this.driver.findElement(
      By.id('login-view')
    ).isDisplayed();
  }

  async obtenerErrorLogin() {
    const error = await this.driver.findElement(
      By.id('login-error')
    );

    await this.driver.wait(async () => {
      const mensaje = await error.getText();
      return mensaje.trim().length > 0;
    }, 10000);

    return error.getText();
  }
}

module.exports = LoginPage;
