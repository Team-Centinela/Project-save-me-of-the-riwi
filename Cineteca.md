# Cineteca — App web

**Descubrimiento de cine y biblioteca personal · cliente web (solo consumo de API)**

> **Guía del proyecto.** Dice *qué* se construye y *por qué* cada decisión importa. El paso a paso técnico —comandos, archivos, configuración— vive en la **Guía Técnica**. Aquí no hay una sola línea de código a propósito: si una decisión no se puede explicar con palabras, todavía no está entendida.

---

## El encargo

Un cineclub los contrató para construir **Cineteca**: una app web donde la gente descubre películas y arma su propia biblioteca — lo que quiere ver, lo que ya vio, listas temáticas que puede compartir por enlace.

El catálogo ya existe. Es **TMDB**, una API REST pública con quince años de historia y millones de fichas mantenidas por una comunidad. Ustedes no construyen servidor ni base de datos: consumen la API y construyen la experiencia.

Tienen **una semana**. Al cierre, alguien que nunca vio la app tiene que poder abrir un enlace, filtrar el catálogo, buscar por texto, abrir una ficha, guardar películas en su biblioteca y compartir la URL exacta de lo que está viendo — sin que nada se rompa cuando la red se caiga, cuando falte un dato o cuando el navegador esté en alemán.

### El foco, y lo que queda fuera desde el primer día

Este proyecto enseña **una sola cosa bien**: consumir una API ajena con criterio. Validar lo que llega, tratar la caché como una copia que caduca, modelar los estados imposibles fuera del tipo y cubrir los cuatro caminos de cada pantalla.

Por eso **no hay cuentas, ni inicio de sesión, ni roles, ni permisos**. No es que no importen: es que en siete días multiplican la complejidad accidental y tapan la lección de fondo. La biblioteca del usuario vive en **su navegador**, y eso —lejos de ser un atajo— trae su propio problema interesante: el almacenamiento local es otro borde no confiable, y se valida al leer con el mismo rigor que una respuesta de red.

---

## El dominio: estados, dinero y ausencias

El dominio es TypeScript puro: no sabe que existe React, ni Axios, ni el navegador. Eso es lo que lo hace barato de probar y lo que permite exigirle el 100% de cobertura sin dolor.

**Los estados, como conjuntos cerrados de variantes.** El estado de una película y la fiabilidad de su valoración se modelan con uniones discriminadas, y cada rama trae **exactamente** los datos que le corresponden. Al consumirlas, un `switch` con un caso por defecto que el compilador considere inalcanzable obliga a cubrir todas las variantes.

**Las ausencias, explícitas en el tipo.** Ningún `0` ni ninguna cadena vacía de TMDB sobrevive al borde: se traducen a "no hay dato" en el mismo sitio donde se valida la respuesta. De ahí para dentro, el tipo dice la verdad y la pantalla está obligada a tratar el caso.

**El dinero, en enteros.** Un presupuesto no es un número con decimales flotantes —esa aritmética pierde céntimos— sino una cantidad entera en la unidad menor de su moneda, acompañada de la moneda. Tres cosas que hay que interiorizar:

- **Nunca un decimal flotante para dinero.** Enteros en unidades menores, siempre.
- **Moneda y locale son cosas distintas.** La moneda es un dato de la película (TMDB reporta en dólares); el formato es preferencia de quien mira. Los mismos 63 millones se ven `$63,000,000` con el navegador en inglés de Estados Unidos y `63.000.000 $` con el navegador en alemán, y las dos son correctas.
- **El formateo no se escribe a mano.** Números, monedas, fechas y plurales los resuelve la API de internacionalización del navegador. Un separador de miles puesto con `replace` es un bug esperando un idioma.

**Las dos reglas que van en el README:** prohibido un número que represente dinero fuera del tipo `Money`; prohibido un `0` que signifique "no lo sé".

---

## El contrato con la API que consumen

**Base:** `https://api.themoviedb.org/3` · **Imágenes:** `https://image.tmdb.org/t/p/{tamaño}{ruta}`, donde el catálogo de tamaños lo entrega el propio endpoint de configuración.

**Credencial.** La app manda una credencial de **solo lectura** en cada petición. Va dentro del bundle, así que es pública: por eso se usa una cuenta de práctica y se puede rotar en un minuto. Compilen la app y busquen la cadena dentro de los archivos generados — la van a encontrar, y ese hallazgo va documentado en el README.

**Errores.** TMDB responde con un código propio que **no coincide** con el código HTTP: "recurso no encontrado" es su código 34 con un 404, y "página inválida" es su código 22 con un 400. Esa traducción se hace una sola vez, en el borde, y de ahí para dentro nadie vuelve a ver un error crudo de la librería HTTP.

**Paginación.** Por número de página, 20 resultados por página y **un tope duro de 500 páginas**: la API no sirve más allá, aunque diga que hay novecientas. Ese tope no es un detalle, es una regla de negocio que su paginación infinita tiene que respetar.

**Límite de tasa.** Unas 50 peticiones por segundo por IP. Ante un `429`, respetar la espera que indica el servidor.

| Endpoint | Para qué |
|---|---|
| `GET /configuration` | Base y tamaños de imagen. Se pide una vez y se cachea para siempre |
| `GET /genre/movie/list` | Catálogo de géneros para los filtros |
| `GET /discover/movie` | **Descubrimiento con filtros**: género, año, nota mínima, votos mínimos, orden |
| `GET /search/movie` | Búsqueda por texto |
| `GET /movie/{id}` | Ficha completa. Con el parámetro de expansión trae elenco y tráilers **en la misma petición** |
| `GET /movie/{id}/recommendations` | Recomendadas, para la sección inferior de la ficha |
| `GET /trending/movie/week` | Portada de la pantalla de inicio |

Siete endpoints. Toda la dificultad del proyecto está en cómo los consumen, no en cuántos son.

> **El parámetro de expansión merece su párrafo.** Sin él, pintar una ficha son cuatro viajes a la red; con él, uno. Con el límite de tasa de TMDB y un aula entera compartiendo IP, esa diferencia se nota.

---

## Las pantallas y los cuatro estados

Toda pantalla que muestra datos tiene **cuatro caminos, no uno**. En un buscador, el estado vacío no es un caso raro: es lo que ve la mitad de la gente que filtra demasiado.

| Estado | Qué se muestra |
|---|---|
| **Carga** | Un esqueleto con la forma de las tarjetas reales, no un indicador giratorio centrado. El esqueleto comunica qué va a aparecer y evita que el diseño salte cuando llegan los datos |
| **Error** | Lenguaje llano y un botón de reintento. "No pudimos cargar las películas", no "Error 500". Si es límite de tasa: "vamos demasiado rápido, reintentando en 3 s" |
| **Vacío inicial** | "Tu cineteca está vacía", con un enlace a explorar. Un vacío sin salida es un callejón |
| **Vacío por filtro** | "Ninguna película coincide con estos filtros", con un botón para **limpiarlos**. Convertir el callejón en una acción es la mitad del trabajo de experiencia de usuario de este proyecto |

**La tarjeta de película** tiene tres niveles de jerarquía, no uno: el título en semibold, el año y la duración atenuados, y la valoración en su propio nivel tipográfico con su recuento y su plural correcto. El estado nunca se comunica solo con color: una película sin estrenar lleva una etiqueta con texto, no solo un borde gris. Y el póster reserva su proporción **antes** de cargar, para que la cuadrícula no salte.

**Las pantallas y su relación con la URL:**

- **Inicio** — tendencias de la semana y acceso a explorar.
- **Explorar** — filtros y resultados. **Los filtros viven en la URL**, no en el estado del componente: recargar mantiene la vista y compartir el enlace la reproduce exacta en otro navegador.
- **Búsqueda** — texto libre con espera antes de consultar.
- **Ficha de película** — ruta con identificador, pensada para compartirse. Es la URL que la gente manda por chat, así que es una función central del producto, no un extra.
- **Mi cineteca** — lo guardado, y las listas locales con su detalle.

**El estado de la vista vive en la URL; el estado del servidor vive en la caché.** Entre los dos no queda casi nada, y eso explica por qué en este proyecto no hay un almacén global de estado.

Y un detalle que casi nadie hace: **la URL también es un borde no confiable.** Un filtro con un valor absurdo escrito a mano no puede romper la pantalla; se valida igual que una respuesta de red y se cae con elegancia a los valores por defecto.

---

## Formatos y accesibilidad

**Hay dos internacionalizaciones distintas y confundirlas cuesta un día.** El **contenido** (títulos, sinopsis) lo traduce TMDB si se le pide el idioma en la petición. Los **formatos** (fechas, números, dinero, duraciones, plurales) los resuelve el navegador. Y los **textos de la interfaz** son de ustedes: viven en un módulo de textos, y ninguna cadena visible se escribe suelta dentro de un componente.

La trampa que sale en la evaluación: **la traducción que no existe.** Si la sinopsis llega vacía porque TMDB no la tiene en español, eso no es un error de red ni un hueco: es un estado del producto. Se ofrece la versión en inglés con un aviso claro. Ahí se ve la diferencia entre una app internacional y una traducida a medias.

**Accesibilidad y pruebas son el mismo trabajo:** si un test encuentra un botón por su rol y su nombre, un lector de pantalla también lo encuentra; si hace falta un identificador de prueba para localizarlo, ese botón tampoco es accesible.

- Una tarjeta es **un** enlace con nombre accesible completo: "El padrino, 1972, 8,7 de 10".
- Al cambiar de ruta, el título del documento cambia y el foco va al encabezado. Sin eso, el lector de pantalla sigue leyendo la página anterior.
- Los errores de formulario se **anuncian**, no solo se pintan en rojo, y el foco salta al primer campo inválido.
- Contraste suficiente en todo el texto, incluido el que va sobre un póster, y ningún estado comunicado solo con color.
- La app aguanta zoom al 200% sin cortes ni scroll horizontal.
- Todo se alcanza con el teclado. La prueba honesta: guarden el ratón en un cajón y recorran la app entera.

---

## El stack completo

Las versiones son las estables verificadas contra el registry de npm el 19 de agosto de 2026. **La tabla es una foto; el registry es la verdad**: verifíquenlas antes de instalar y usen la última estable que el resto del ecosistema soporte — nunca versiones de prueba.

| Capa | Herramienta | Versión | Por qué |
|---|---|---|---|
| Build | **Vite** | 8.2.1 | Arranque instantáneo, recarga en caliente real, build optimizado sin configurar |
| Lenguaje | **TypeScript** (estricto) | **6.0.3** | **No la 7**: el linter con reglas de tipo todavía no la admite, y ese linter es quien impone la arquitectura. Simbiosis antes que novedad |
| UI | **React** | 19.2.8 | — |
| Rutas | **React Router** | 8.3.0 | Rutas anidadas, estado en la URL, carga por ruta |
| Estilos | **Tailwind CSS** | 4.3.3 | Tokens de diseño en el CSS, sin archivo de configuración |
| Variantes | **cva** + **tailwind-merge** + **clsx** | 0.7.1 / 3.6.0 / 2.1.1 | Variantes tipadas y fusión de clases sin colisiones |
| Datos remotos | **TanStack Query** | 5.101.4 | Caché, revalidación, paginación infinita, mutaciones optimistas |
| Transporte | **Axios** | 1.19.0 | Una sola instancia, interceptores, cancelación |
| Validación | **Zod** | 4.4.3 | El schema es el tipo. Valida la red, el almacenamiento local y los formularios |
| Formularios | **React Hook Form** + resolvers | 7.85.0 / 5.9.1 | Renders mínimos; el mismo schema valida y tipa |
| Virtualización | **@tanstack/react-virtual** | 3.14.10 | Memoria constante con miles de tarjetas |
| Iconos | **lucide-react** | 1.33.0 | Ligero y con importación selectiva |
| Errores de UI | **react-error-boundary** | 6.1.3 | Un error de render no deja la pantalla en blanco |
| Pruebas | **Vitest** + **Testing Library** + **MSW** | 4.1.11 / 16.3.2 / 2.15.0 | Dominio en unitarias, componentes por rol accesible, red simulada en el borde |
| Calidad | **ESLint** + **typescript-eslint** + **Prettier** | 10.8.1 / 8.67.0 / 3.9.6 | Cero advertencias toleradas |
| Gate | **Husky** + **lint-staged** + `verify.sh` | 9.1.7 / 17.3.0 | Un commit con un tipo `any` no entra |
| Paquetes | **pnpm** | 11.22.0 | Instalación rápida y determinista |

**Opcionales, si hacen falta:** las devtools de TanStack Query (ver la caché en vivo vale un día de depuración), el plugin de ESLint para Query, el plugin de accesibilidad para JSX y `axe-core` para automatizar una parte del repaso de accesibilidad.

**Fuera de la lista a propósito:** Redux, Zustand, Jotai. **El estado del servidor lo lleva la caché de Query; el estado de la vista, la URL; la biblioteca, su propio módulo de almacenamiento.** Si al final de la semana necesitan un almacén global, hay algo mal modelado, y esa conversación es parte del ejercicio.

---

## Estructura del proyecto

Clean Architecture, con **la regla de dependencia protegida por el linter**: las dependencias apuntan hacia dentro y el dominio no sabe que existe React.

- **`domain/`** — TypeScript puro. Entidades, estados, políticas, schemas de validación, formateadores, errores. Cero imports de React, de Axios y de la caché.
- **`application/`** — casos de uso y **puertos**: las interfaces de "algo que trae películas" o "algo que guarda la biblioteca", sin saber cómo lo hacen.
- **`infrastructure/`** — **implementa** los puertos: el cliente HTTP con sus interceptores, un módulo por recurso que valida lo que llega, y el adaptador del almacenamiento del navegador.
- **`presentation/`** — React y solo React: rutas, componentes, hooks de datos, proveedores y el módulo de textos.

La duda real de la semana no es qué carpetas hay, sino **dónde va este archivo**. La regla de bolsillo: si un archivo del dominio necesitara instalar algo para funcionar, está en la carpeta equivocada.

**La demostración de 60 segundos:** importen un hook de React dentro del dominio y miren caer el linter. Una regla de arquitectura que solo vive en un diagrama se rompe el jueves; una que vive en el linter y en el CI, no.

---

## Reglas del juego

**El código en inglés, la interfaz en español.** Identificadores, archivos, ramas, commits y tests en inglés. El texto que ve el usuario vive en el módulo de textos.

**Nada entra a `main` sin el gate.** Un solo script corre formato, linter, tipos, pruebas con umbral de cobertura y build — el mismo archivo en su máquina y en el CI, para que no puedan separarse. Tiene presupuesto de tiempo: rápido antes de cada commit, completo antes de cada push. Un gate lento acaba en un `--no-verify` el viernes a las diez de la noche, y ahí lo perdieron.

**Cobertura: 100% en el dominio, 80% global.** El dominio es puro y barato de cubrir. Si un archivo del dominio es difícil de probar, el problema es el diseño, no el test.

**Si no lo pueden explicar, no lo entregan.** Examen oral aleatorio. No poder explicar una función propia línea a línea cuenta como no entregada, por bien que funcione la app.

**El borde se valida siempre, y hay tres bordes:** la red, el almacenamiento local y la URL. Ninguno es de fiar.

**Atribución a TMDB, obligatoria.** Los términos de uso exigen mostrar el logo y la frase correspondiente. No es un detalle estético: es la licencia bajo la que consumen el servicio. Va en el pie de página desde el día 1.

---

## Fuera del alcance

No trabajen en esto, aunque les sobre tiempo:

- **Cuentas, inicio de sesión, roles y permisos.** Es la exclusión deliberada del proyecto: la biblioteca vive en el navegador.
- **Sincronizar la biblioteca entre dispositivos** o cualquier forma de nube propia.
- **Un backend o un proxy propio** para ocultar la credencial de lectura.
- **Series de TV** como sección con pantallas dedicadas.
- **Modo sin conexión persistente** con service worker.

Si terminan el alcance base, vayan hacia **profundidad, no hacia funciones nuevas**: más estados cubiertos, mejor accesibilidad, más casos límite probados, un buscador más robusto ante la red mala.

---

## Ritmo de la semana

El detalle operativo —comandos, archivos, orden exacto— está en la **Guía Técnica**. Esta es la vista de producto.

| Día | Objetivo | Entregable demostrable |
|---|---|---|
| **1** | Cimientos y dominio | Proyecto creado, gate en verde, estados y políticas **con sus pruebas**, sin una sola pantalla |
| **2** | Primer corte vertical | Explorar con datos reales, sus cuatro estados y los filtros en la URL |
| **3** | Búsqueda y ficha | Ficha completa con las ausencias visibles como "sin dato", búsqueda con espera, imágenes en el tamaño correcto |
| **4** | La biblioteca local | Guardar y quitar con vuelta atrás, y el almacenamiento validado al leer |
| **5** | Listas y formularios | Crear y editar listas locales con formulario validado, con sus dos motivos de bloqueo |
| **6** | Endurecer | Virtualización, accesibilidad, formatos por locale, cobertura |
| **7** | Entregar | README, despliegue, repaso del checklist y ensayo del oral |

**La regla del día 1 es la que más cuesta respetar y la que más rinde:** no se pinta nada hasta que el dominio esté modelado y probado. Un día "sin pantallas" se siente improductivo y es el que sostiene los otros seis. Los equipos que se lo saltan llegan al día 5 con la misma regla escrita en cuatro componentes distintos.

---

## Criterios de evaluación

Se evalúa en tres momentos: **el repositorio** (código y commits), **la demo** (10 minutos en un navegador, con la red estrangulada a propósito) y **el oral** (preguntas al azar sobre su propio código). Un mismo trabajo puede sacar 9 en la demo y 3 en el oral: es el mismo esfuerzo mal repartido.

| # | Dimensión | Peso | Qué se mira exactamente |
|---|---|:--:|---|
| 1 | **Arquitectura y límites** | 20% | La regla de dependencia se cumple y **el linter la impone**. Ningún componente conoce la librería HTTP. Los puertos existen y las pruebas usan dobles de esos puertos, no de librerías |
| 2 | **Modelado del dominio y ausencias** | 15% | Uniones discriminadas donde hay estados; los `switch` cubiertos por el compilador; ningún `0` ni cadena vacía de TMDB sobrevive al borde; el dinero en enteros |
| 3 | **Validación de los tres bordes** | 10% | Red, almacenamiento local y URL, los tres validados. Cero afirmaciones de tipo sin comprobar, cero `any`. Se prueba en vivo: se rompe una respuesta simulada y se mira qué hace la app |
| 4 | **Datos remotos y caché** | 15% | Claves jerárquicas; filtros normalizados; frescura justificada por tipo de dato; mutación optimista con cancelación, vuelta atrás e invalidación **cruzada**; sin reintentos inútiles; paginación infinita que respeta el tope de la API |
| 5 | **Formularios** | 10% | Un solo schema que valida y tipa; errores accesibles y en español; envío bloqueado mientras vuela; cada motivo de bloqueo con su propio mensaje, nunca un "no se puede" genérico |
| 6 | **UI, cuatro estados y accesibilidad** | 15% | Los cuatro estados en **cada** vista con datos; navegación completa por teclado; foco visible; zoom al 200%; contraste suficiente; nada comunicado solo con color |
| 7 | **Pruebas** | 10% | 100% en el dominio, 80% global. Pruebas que describen comportamiento, no implementación. Deterministas: reloj controlado, cero esperas reales. Un test que nunca falla no prueba nada |
| 8 | **Proceso y entrega** | 5% | Gate en verde en el CI; commits pequeños; cero `--no-verify`; README que un extraño puede seguir; atribución a TMDB presente |

**Escala por dimensión:** 4 cumple, está probado **y saben explicar la decisión y la alternativa que descartaron** · 3 cumple y está probado, con justificación superficial · 2 funciona en el camino feliz y se cae en un caso límite previsible · 1 presente pero mal aplicado (validar unos endpoints y otros no) · 0 ausente.

Nota final = suma de (nivel ÷ 4 × peso). **Se aprueba con 70%** y con la condición de que ninguna dimensión esté en 0.

### Descalificadores automáticos

Da igual lo bonita que quede la app:

- Un `any` sin comentario que lo justifique, o una supresión muda del compilador.
- Un `--no-verify` en el historial, o un gate debilitado para que pase.
- Una respuesta de la API consumida con una afirmación de tipo en vez de validarla.
- La misma regla decidida en dos sitios: el dominio y un componente.
- Ausencia de la atribución a TMDB.
- No poder explicar una función propia en el oral.

### Preguntas típicas del oral

Que sirvan también de guía de estudio: *¿por qué se cancela lo que está en vuelo antes de una actualización optimista?* · *enséñenme la línea exacta donde un `0` de TMDB deja de significar cero* · *¿qué se rompe si el texto del buscador entra crudo en la clave de caché?* · *¿por qué la fecha actual entra por parámetro en la política y no se consulta dentro?* · *si mañana TMDB añade un estado nuevo, ¿qué archivo deja de compilar?* · *¿por qué el almacenamiento local se valida al leer, si lo escribió su propia app?* · *¿qué otras vistas muestran el dato que acaban de mutar?*

---

## Criterios de aceptación · Definition of Done

Se verifica en un navegador real, con las DevTools abiertas y la red estrangulada.

**Funcional**

- [ ] Los cuatro estados en explorar: carga, error, vacío inicial y vacío por filtro
- [ ] El vacío por filtro ofrece limpiarlos, y al hacerlo vuelve a haber resultados
- [ ] Recargar con filtros aplicados reproduce la vista exacta; el enlace funciona en otro navegador
- [ ] Teclear diez letras dispara **una** petición, no diez (con la pestaña de red abierta)
- [ ] Un filtro con un valor absurdo escrito a mano en la URL no rompe la pantalla
- [ ] Volver atrás tras guardar algo muestra el estado nuevo, no el viejo

**Datos y red**

- [ ] Toda respuesta se valida; romper un campo en la simulación produce un error localizado y claro
- [ ] Un límite de tasa no dispara un bucle de reintentos
- [ ] Guardar en la biblioteca se ve al instante y **se revierte** si la escritura falla
- [ ] Quitar algo actualiza también la cuadrícula y la pantalla de la biblioteca
- [ ] La paginación infinita se detiene con un mensaje al llegar al tope de la API
- [ ] Un dato corrupto en el almacenamiento local se descarta sin tumbar la app

**Datos incompletos**

- [ ] Un presupuesto desconocido se ve como "Sin dato", nunca como "$0"
- [ ] Una película sin póster tiene marcador de posición, no un icono roto
- [ ] Una película sin votos dice "Sin valoraciones", no 0,0
- [ ] Una valoración con pocos votos se distingue visualmente de una consolidada
- [ ] Una sinopsis ausente en español ofrece la versión en inglés con su aviso

**Formatos**

- [ ] Duración como "2 h 15 min"; votos con separador de miles y plural correcto
- [ ] Fechas, números y dinero correctos con el navegador en español, en inglés y en alemán
- [ ] El diseño aguanta el alemán sin romperse

**Accesibilidad**

- [ ] Toda la app es navegable solo con teclado y el foco siempre se ve
- [ ] Una tarjeta es un enlace con nombre accesible completo
- [ ] Al cambiar de ruta cambian el título del documento y la posición del foco
- [ ] Los errores de formulario se anuncian
- [ ] Zoom al 200% sin cortes ni scroll horizontal; contraste suficiente

**Rendimiento**

- [ ] Scroll fluido con 2.000 tarjetas y memoria que no crece sin techo
- [ ] Los pósters de la cuadrícula piden el tamaño pequeño, no el original
- [ ] Sin salto de diseño al cargar las imágenes
- [ ] Cada ruta se descarga al visitarse; el arranque cabe en el presupuesto

**Entrega**

- [ ] El gate completo en verde, en local y en el CI; `main` protegida
- [ ] README que un extraño sigue de cero a app corriendo
- [ ] Desplegada en una URL pública que otra persona abre — incluido un enlace profundo recargado
- [ ] Atribución a TMDB visible

---

## Cuándo está terminado

Al cierre, su equipo tiene que poder pararse frente a alguien que nunca vio la app, en un navegador real, y mostrarle:

- que puede **explorar el catálogo** con filtros entre miles de resultados, y que el enlace que comparte reproduce exactamente lo que estaba viendo — con los cuatro estados cubiertos;
- que puede **abrir una ficha** donde un presupuesto desconocido dice "sin dato", una película sin votos no finge un 0,0 y una sin póster no rompe nada;
- que puede **guardar y organizar** su biblioteca, que el corazón responde antes que el disco y **vuelve solo a su sitio** cuando la escritura falla;
- que un dato **corrupto o inventado** —en la URL o en el almacenamiento— no tumba la aplicación;
- que **toda la app se usa con el teclado**, que el lector de pantalla la recorre con sentido y que al 200% de zoom sigue entera;
- y que otra persona **abre la URL desplegada** y la usa sin que ustedes toquen nada.

Lo que se llevan no es la app: es el criterio para consumir cualquier API con cabeza —validar cada borde, tratar la caché como una copia que caduca, modelar los estados imposibles fuera del tipo, no dejar que un hueco se disfrace de dato— en el siguiente proyecto, con otro dominio y otras herramientas.

---

*Este producto usa la API de TMDB pero no está avalado ni certificado por TMDB.*
