const { By, until } = require('selenium-webdriver');

class CarteleraPage {
  constructor(driver) {
    this.driver = driver;
  }

  async esperar() {
    await this.driver.wait(
      until.elementIsVisible(
        await this.driver.findElement(By.id('cartelera-view'))
      ),
      15000
    );
    await this.driver.wait(async () => {
      const tarjetas = await this.driver.findElements(By.css('#movies-grid .movie-card'));
      return tarjetas.length > 0;
    }, 10000);
  }

  async contarPeliculas() {
    await this.esperar();
    const tarjetas = await this.driver.findElements(By.css('#movies-grid .movie-card'));
    return tarjetas.length;
  }

  async obtenerTitulos() {
    await this.esperar();
    const elementos = await this.driver.findElements(By.css('#movies-grid .movie-card h3'));
    return Promise.all(elementos.map(elemento => elemento.getText()));
  }

  async seleccionarPelicula(id) {
    await this.driver.findElement(By.id(`pelicula-${id}`)).click();
    await this.driver.wait(
      until.elementIsVisible(
        await this.driver.findElement(By.id('reserva-view'))
      ),
      15000
    );
  }

  async obtenerTituloSeleccionado() {
    return this.driver.findElement(By.id('selected-movie-title')).getText();
  }

  async volverACartelera() {
    await this.driver.findElement(By.id('back-cartelera')).click();
    await this.esperar();
  }

  async carteleraVisible() {
    return this.driver.findElement(By.id('cartelera-view')).isDisplayed();
  }
}

module.exports = CarteleraPage;
