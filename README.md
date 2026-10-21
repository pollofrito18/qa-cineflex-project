
# CineFlex | Aseguramiento de calidad y pruebas automatizadas

**Proyecto:** Taller Práctico Integrador — QA en Producción

**Integrantes:** Luis, Marlon y Esteban

**Repositorio:** https://github.com/pollofrito18/qa-cineflex-project

**Video de sustentación (3 minutos):** Pendiente de agregar el enlace público.

---

## 1. Descripción del proyecto

CineFlex es una plataforma web simulada para la reserva y compra de entradas de cine.

El proyecto permite iniciar sesión, consultar la cartelera, seleccionar películas y horarios, elegir asientos, simular pagos y generar tickets virtuales.

El objetivo principal es implementar y demostrar técnicas de aseguramiento de calidad mediante pruebas de API, interfaz, rendimiento e integración continua.

**Importante:** CineFlex es un entorno académico. No realiza transacciones bancarias reales y las reservas se almacenan temporalmente en memoria.

## 2. Arquitectura y tecnologías

| Componente | Tecnología | Función |
|---|---|---|
| Frontend | HTML, CSS y JavaScript | Interfaz de usuario |
| Backend | Node.js y Express | API REST y lógica de negocio |
| Seguridad | Helmet, JWT y bcryptjs | Autenticación y protección |
| Registro | Morgan | Trazabilidad de solicitudes |
| API Testing | Postman y Newman | Validación automatizada de endpoints |
| UI Testing | Selenium WebDriver | Automatización del navegador |
| Patrón POM | Page Object Model | Separación de acciones y pruebas |
| Rendimiento | Apache JMeter | Pruebas de carga |
| Integración continua | GitHub Actions | Ejecución automática de Newman |

## 3. Estructura del repositorio

```text
qa-cineflex-project/
├── README.md
├── estrategia_pruebas.pdf
├── backend/
│   ├── server.js
│   ├── package.json
│   └── package-lock.json
├── frontend/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── api_tests/
│   ├── CineFlex_API_Collection.json
│   └── CineFlex_Environment.json
├── ui_tests/
│   ├── pages/
│   │   ├── LoginPage.js
│   │   ├── CarteleraPage.js
│   │   └── ReservaPage.js
│   ├── test_suite.js
│   └── package.json
├── performance/
│   └── prueba_carga.jmx
├── evidencias/
│   └── Evidencias_CineFlex_Recuperadas/
└── .github/
    └── workflows/
        └── qa-pipeline.yml
```

## 4. Requisitos para ejecutar CineFlex

Se necesita:

- Node.js y npm.
- Git.
- Visual Studio Code.
- Google Chrome.
- Postman, para las pruebas de API.
- Java y Apache JMeter, para las pruebas de carga.

## 5. Instalación y ejecución

### Clonar el repositorio

```powershell
git clone https://github.com/pollofrito18/qa-cineflex-project.git
cd qa-cineflex-project
```

### Instalar dependencias

```powershell
cd backend
npm ci
```

### Variables de entorno

Crear un archivo `.env` dentro de `backend`:

```env
PORT=3000
JWT_SECRET=GENERAR_UNA_CLAVE_ALEATORIA_SEGURA
```

Se puede generar una clave desde PowerShell:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**No publicar el archivo `.env` ni claves privadas.**

### Ejecutar el servidor

Desde `backend`:

```powershell
npm start
```

Abrir la aplicación en:

http://localhost:3000/

Comprobar el servidor:

http://localhost:3000/api/health

### Usuario de demostración

**Correo:** `cliente@cineflex.com`

**Contraseña:** `CineFlex123!`

Estas credenciales son únicamente para el entorno académico simulado.

## 6. Fase A — Estrategia de pruebas

### Reto 1: Integración Top-Down y Stub bancario

Se seleccionó la estrategia Top-Down para comprobar las funcionalidades principales de CineFlex mientras se sustituye temporalmente la pasarela bancaria externa.

En `backend/server.js` se implementó una simulación bancaria con dos respuestas:

- `PRUEBA_APROBADA`: acepta el pago y permite generar un ticket.
- `TARJETA_FALSA`: rechaza el pago mediante HTTP 402.

Esto permite validar las reservas sin realizar operaciones bancarias reales.

### Reto 2: Requisitos y regresión

**Requisitos funcionales:**

1. El usuario debe poder iniciar sesión.
2. El usuario debe poder reservar un asiento disponible mediante un pago aprobado.

**Requisitos no funcionales:**

1. La consulta de cartelera debe responder en menos de 300 milisegundos en el entorno de pruebas.
2. El sistema debe evaluarse bajo una carga de 500 usuarios virtuales con arranque gradual.

**Estrategia de regresión:**

Las pruebas se seleccionan según el impacto de cada cambio.

Modificar el color de un botón secundario no requiere repetir todas las pruebas bancarias. Sin embargo, modificar la autenticación, las reservas o los pagos exige ejecutar nuevamente las pruebas correspondientes.

### Reto 3: Selenium frente a Cypress

| Criterio | Selenium | Cypress |
|---|---|---|
| Objetivo | Automatización de navegadores | Pruebas y depuración web |
| Navegadores | Amplio soporte mediante WebDriver | Navegadores compatibles con Cypress |
| Patrón POM | Adecuado para estructurar pruebas | Puede organizarse mediante comandos y abstracciones |
| Aplicación en CineFlex | Flujos completos de reserva | Pruebas rápidas del Frontend |

Se eligió Selenium WebDriver para automatizar las acciones del usuario y organizar el código mediante Page Object Model.

## 7. Pruebas de API — Postman y Newman

La colección contiene tres peticiones principales:

| Método | Endpoint | Validación |
|---|---|---|
| POST | `/api/auth/login` | Inicio de sesión y captura de JWT |
| GET | `/api/cartelera` | JSON válido y respuesta menor a 300 ms |
| POST | `/api/reservas` | Rechazo de tarjeta falsa mediante HTTP 402 |

### Ejecutar Newman

Con el Backend funcionando, abrir otra terminal desde la carpeta principal del proyecto:

```powershell
cd backend
npx newman run ..\api_tests\CineFlex_API_Collection.json -e ..\api_tests\CineFlex_Environment.json
```

**Resultado verificado anteriormente:**

- 3 peticiones.
- 16 aserciones aprobadas.
- 0 aserciones fallidas.

El código HTTP 402 es el resultado esperado de la prueba negativa de pago.

### Evidencia de Postman

![Resultados de Postman](evidencias/Evidencias_CineFlex_Recuperadas/06_postman_16_de_16.png)

## 8. Pruebas de interfaz — Selenium WebDriver

Las pruebas se organizan mediante el patrón Page Object Model.

Las clases están ubicadas en:

- `ui_tests/pages/LoginPage.js`
- `ui_tests/pages/CarteleraPage.js`
- `ui_tests/pages/ReservaPage.js`

Las verificaciones se encuentran en `ui_tests/test_suite.js`.

### Ejecutar Selenium

Desde la carpeta principal del proyecto, con el Backend encendido:

```powershell
cd ui_tests
npm ci
npm test
```

**Resultado verificado anteriormente:**

- 15 pruebas aprobadas.
- 0 pruebas fallidas.

**Pendiente de verificar:** los casos obligatorios específicos de bloqueo tras tres intentos incorrectos, comprobación del título Cartelera en el DOM y navegación con el botón Atrás después de cerrar sesión.

El resultado total se actualizará cuando se ejecuten satisfactoriamente estos casos.

## 9. Pruebas de rendimiento — Apache JMeter

El archivo de configuración se encuentra en:

`performance/prueba_carga.jmx`

### Configuración

| Parámetro | Valor |
|---|---|
| Usuarios virtuales | 500 |
| Ramp-up | 15 segundos |
| Iteraciones | 1 |
| Endpoint | `/api/peliculas/1/asientos` |
| Autenticación | JWT |

### Resultados

En la prueba local realizada se obtuvieron:

- 500 consultas de asientos y un inicio de sesión de preparación.
- 501 solicitudes registradas en total.
- 0 % de errores.
- Aproximadamente 3 ms de respuesta promedio.
- Alrededor de 33,4 consultas por segundo en la operación de consulta de asientos.

Estos resultados corresponden al entorno local de pruebas, no a infraestructura real de producción.

### Evidencia del Summary Report

![JMeter Summary Report](evidencias/Evidencias_CineFlex_Recuperadas/11_jmeter_summary_500_consultas.jpg)

## 10. Integración continua — GitHub Actions

El pipeline se encuentra en:

`.github/workflows/qa-pipeline.yml`

Se ejecuta automáticamente cuando se realizan cambios mediante `push` o `pull_request` a `main`.

El proceso realiza las siguientes acciones:

1. Descarga el código del repositorio.
2. Prepara Node.js.
3. Instala las dependencias.
4. Inicia el servidor de CineFlex con variables de entorno temporales.
5. Comprueba que el Backend responda.
6. Ejecuta la colección automatizada mediante Newman.
7. Marca la ejecución como fallida si alguna prueba no pasa.

**Resultado anteriormente verificado:** 16 aserciones aprobadas y 0 fallidas.

[Ver ejecuciones de GitHub Actions](https://github.com/pollofrito18/qa-cineflex-project/actions)

![GitHub Actions](evidencias/Evidencias_CineFlex_Recuperadas/08_github_actions_16_de_16.png)

## 11. Evidencias del proyecto

### Servidor funcionando

![Backend de CineFlex](evidencias/Evidencias_CineFlex_Recuperadas/01_backend_health.png)

### Pago rechazado

![Pago rechazado](evidencias/Evidencias_CineFlex_Recuperadas/04_pago_rechazado.png)

### Compra aprobada y ticket virtual

![Ticket confirmado](evidencias/Evidencias_CineFlex_Recuperadas/05_ticket_confirmado.png)

### Resultados de Postman

![Postman](evidencias/Evidencias_CineFlex_Recuperadas/06_postman_16_de_16.png)

## 12. Limitaciones

CineFlex es una aplicación de demostración académica.

Las reservas se mantienen en memoria y se reinician al detener el servidor.

La pasarela bancaria es simulada.

Los resultados de JMeter corresponden exclusivamente a las condiciones locales evaluadas.

La ejecución de GitHub Actions automatiza las pruebas de API mediante Newman. Selenium y JMeter se ejecutan por separado.

Antes de utilizar este proyecto en producción sería necesario incorporar persistencia real, fortalecer los controles de seguridad y revisar las dependencias.

## 13. Documento de estrategia

El documento `estrategia_pruebas.pdf` contiene el análisis detallado de los tres retos, los requisitos, la estrategia de regresión, la comparación de herramientas y las evidencias del proyecto.

[Consultar estrategia de pruebas](estrategia_pruebas.pdf)

## 14. Video de sustentación

**Duración máxima:** 3 minutos.

**Integrantes:** Luis, Marlon y Esteban.

**Enlace:** Pendiente de publicar.

El video debe mostrar la arquitectura, los tres retos, la estructura de Selenium con POM y la demostración de pruebas reales.

## 15. Conclusión

CineFlex permitió aplicar estrategias de integración, pruebas de API, automatización de interfaz, pruebas de rendimiento e integración continua.

La combinación de Postman, Newman, Selenium, JMeter y GitHub Actions permitió verificar los principales comportamientos del sistema y documentar los resultados obtenidos.

El repositorio contiene el código fuente, las configuraciones y las evidencias necesarias para reproducir el entorno académico de pruebas.
