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

  async iniciarSesion(email, password) {
    await this.driver.findElement(By.id('login-email')).sendKeys(email);
    await this.driver.findElement(By.id('login-password')).sendKeys(password);
    await this.driver.findElement(By.id('login-submit')).click();

    await this.driver.wait(async () => {
      const cartelera = await this.driver.findElement(
        By.id('cartelera-view')
      );
      return cartelera.isDisplayed();
    }, 15000);
  }

  async obtenerNombreUsuario() {
    return this.driver.findElement(By.id('user-name')).getText();
  }
}

module.exports = LoginPage;
