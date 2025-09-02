# Damas Funer

Un juego de damas multijugador en tiempo real desarrollado con HTML5, CSS3, JavaScript y PHP.

## 🤖 Desarrollo con Cursor

Este proyecto fue desarrollado completamente con la ayuda de **Cursor AI**, sin teclear ni una sola línea de código manualmente. Cursor demostró su capacidad para:

- Crear aplicaciones web completas desde cero
- Implementar lógica de juego compleja
- Añadir efectos CSS animados y graciosos
- Generar código PHP para backend
- Crear esquemas de base de datos
- Escribir documentación completa

**¡Una demostración del poder de la programación asistida por IA!** 🚀

## Características

- 🎮 **Multijugador en tiempo real**: Dos jugadores pueden jugar simultáneamente
- 💬 **Chat integrado**: Los jugadores pueden comunicarse durante la partida
- 📱 **Diseño responsive**: Funciona en dispositivos móviles y de escritorio
- 🎨 **Interfaz moderna**: Diseño atractivo con animaciones suaves
- 🔒 **Sistema seguro**: Validación de movimientos y protección contra spam
- 📊 **Estadísticas**: Seguimiento de partidas y movimientos
- 🌐 **Multiplataforma**: Funciona en cualquier navegador moderno

## Requisitos del Servidor

- PHP 7.4 o superior
- MySQL 5.7 o superior
- Servidor web (Apache, Nginx, etc.)
- Extensiones PHP: PDO, PDO_MySQL

## Instalación

### 1. Clonar o descargar el proyecto

```bash
git clone [https://github.com/xavieroldan/DamasFuner.git]
# o descargar y extraer el archivo ZIP
```

### 2. Configurar la base de datos

1. Crear una base de datos MySQL llamada `6774344_damas_online`
2. Importar el archivo `database/schema.sql`:

```bash
mysql -u tu_usuario -p 6774344_damas_online < database/schema.sql
```

### 3. Configurar la conexión a la base de datos

Editar el archivo `config/database.php` y actualizar las credenciales:

```php
$this->host = 'localhost';
$this->db_name = '6774344_damas_online';
$this->username = 'tu_usuario_mysql';
$this->password = 'tu_contraseña_mysql';
```

### 4. Configurar permisos

Asegúrate de que el servidor web tenga permisos de escritura en:
- `logs/` (para archivos de log)
- `uploads/` (si planeas agregar funcionalidades de archivos)

```bash
chmod 755 logs/
chmod 755 uploads/
```

### 5. Acceder al juego

Abre tu navegador y ve a la URL de tu servidor:
```
http://tu-servidor.com/damas-online/
```

## Estructura del Proyecto

```
damas-online/
├── index.html              # Página principal
├── css/
│   └── style.css          # Estilos del juego
├── js/
│   ├── game.js            # Lógica del juego
│   ├── network.js         # Comunicación con el servidor
│   └── app.js             # Funcionalidades adicionales
├── api/
│   ├── create_game.php    # Crear nueva partida
│   ├── join_game.php      # Unirse a partida
│   ├── get_game_state.php # Obtener estado del juego
│   ├── make_move.php      # Realizar movimiento
│   ├── send_chat.php      # Enviar mensaje de chat
│   ├── leave_game.php     # Abandonar partida
│   └── health_check.php   # Verificar estado del servidor
├── config/
│   └── database.php       # Configuración de la base de datos
├── database/
│   └── schema.sql         # Esquema de la base de datos
└── logs/                  # Archivos de log (se crea automáticamente)
```

## Cómo Jugar

### Crear una Partida

1. Haz clic en "Nueva Partida"
2. Selecciona "Crear Partida"
3. Comparte el código de 6 caracteres con otro jugador

### Unirse a una Partida

1. Haz clic en "Nueva Partida"
2. Selecciona "Unirse a Partida"
3. Ingresa el código de partida y tu nombre
4. Haz clic en "Unirse"

### Reglas del Juego

- Las piezas se mueven diagonalmente
- Las capturas son obligatorias cuando están disponibles
- **Regla de Mayor Valor de Captura**: Si puedes capturar con varias piezas, debes usar la pieza de mayor rango (dama tiene prioridad sobre peón)
- **Regla de Mayor Número de Piezas**: Si tienes varias opciones de captura con la misma pieza, debes elegir la que capture más fichas en esa jugada
- Las piezas se convierten en damas al llegar al final del tablero
- Las damas pueden moverse en cualquier dirección diagonal
- **Condiciones de victoria**:
  - Capturar todas las piezas del oponente
  - Dejar al oponente sin movimientos posibles (bloqueo)

### Controles

- **Click**: Seleccionar pieza y mover
- **Ctrl+N**: Nueva partida
- **Ctrl+J**: Unirse a partida
- **Ctrl+L**: Abandonar partida
- **ESC**: Cerrar modales
- **Enter**: Enviar mensaje de chat

## API Endpoints

### Crear Partida
```
POST /api/create_game.php
Content-Type: application/json

{
    "player_name": "Nombre del Jugador"
}
```

### Unirse a Partida
```
POST /api/join_game.php
Content-Type: application/json

{
    "game_code": "ABC123",
    "player_name": "Nombre del Jugador"
}
```

### Obtener Estado del Juego
```
GET /api/get_game_state.php?game_id=1&player_id=1
```

### Realizar Movimiento
```
POST /api/make_move.php
Content-Type: application/json

{
    "game_id": 1,
    "player_id": 1,
    "from": {"row": 2, "col": 1},
    "to": {"row": 3, "col": 2}
}
```

### Enviar Mensaje de Chat
```
POST /api/send_chat.php
Content-Type: application/json

{
    "game_id": 1,
    "player_id": 1,
    "message": "¡Hola!"
}
```

## Personalización

### Cambiar Colores del Tema

Edita el archivo `css/style.css` y modifica las variables CSS:

```css
:root {
    --primary-color: #667eea;
    --secondary-color: #764ba2;
    --board-light: #F0D9B5;
    --board-dark: #B58863;
}
```

### Configurar Límites

Edita la tabla `system_config` en la base de datos:

```sql
UPDATE system_config SET config_value = '20' WHERE config_key = 'max_games_per_hour';
UPDATE system_config SET config_value = '50' WHERE config_key = 'max_chat_messages_per_minute';
```

## Solución de Problemas

### Error de Conexión a la Base de Datos

1. Verifica las credenciales en `config/database.php`
2. Asegúrate de que MySQL esté ejecutándose
3. Verifica que la base de datos `damas_online` existe

### El Juego No Carga

1. Verifica que PHP esté habilitado en tu servidor
2. Revisa los logs de error en `logs/error.log`
3. Asegúrate de que todas las extensiones PHP necesarias estén instaladas

### Los Movimientos No Se Sincronizan

1. Verifica la conexión a internet
2. Revisa la consola del navegador para errores JavaScript
3. Comprueba que el polling esté funcionando (cada 2 segundos)

## Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crea un Pull Request

## 📄 Licencia

Este proyecto está bajo la **Licencia Creative Commons Atribución-NoComercial-CompartirIgual 4.0 Internacional (CC BY-NC-SA 4.0)**.

### ¿Qué significa esto?

✅ **Puedes:**
- **Compartir**: Copiar y redistribuir el material en cualquier medio o formato
- **Adaptar**: Remezclar, transformar y construir a partir del material
- **Atribuir**: Debes dar crédito apropiado, proporcionar un enlace a la licencia, e indicar si se hicieron cambios

❌ **No puedes:**
- **Usar comercialmente**: No puedes usar el material para propósitos comerciales

🔄 **Compartir igual**: Si remezclas, transformas o construyes a partir del material, debes distribuir tus contribuciones bajo la misma licencia que el original.

### Resumen legal completo
Para ver el texto legal completo de esta licencia, visita: https://creativecommons.org/licenses/by-nc-sa/4.0/deed.es

### ¿Por qué esta licencia?
Esta licencia permite que cualquiera pueda usar, modificar y compartir el juego libremente, pero evita que se use para generar ganancias comerciales, manteniendo el espíritu de código abierto y educativo.

## Soporte

Si tienes problemas o preguntas:

1. Revisa la sección de Solución de Problemas
2. Busca en los Issues existentes
3. Crea un nuevo Issue con detalles del problema

## Changelog

### v1.2.0 - "Efectos Cómicos"
- ✅ Cambio de nombre a "Damas Funer"
- ✅ Efectos CSS graciosos tipo cómic al cargar la página
- ✅ Animaciones de explosión al capturar piezas (¡BOOM! 💥)
- ✅ Efectos de celebración al promocionar a dama (¡CORONACIÓN! 👑)
- ✅ Animaciones de rebote en botones y casillas
- ✅ Efectos de brillo y partículas en el tablero
- ✅ Mensajes cómicos durante el juego
- ✅ Efectos de sparkle (✨) en las damas
- ✅ Animaciones de ondas en el tablero

### v1.1.0
- ✅ Implementadas reglas de captura obligatoria de la versión española/internacional
- ✅ Regla de "Mayor valor de captura" (dama tiene prioridad sobre peón)
- ✅ Regla de "Mayor número de piezas" (elegir captura que coma más fichas)
- ✅ Corrección de terminología: "reyes" → "damas"
- ✅ Mejoras en la lógica de capturas múltiples
- ✅ Sistema de mensajes informativos para movimientos no válidos
- ✅ Feedback visual cuando se intenta hacer un movimiento ilegal
- ✅ Detección automática de victoria por captura de todas las piezas
- ✅ Detección automática de victoria por bloqueo (sin movimientos)
- ✅ Interfaz de fin de juego con mensajes de victoria

### v1.0.0
- Lanzamiento inicial
- Multijugador en tiempo real
- Chat integrado
- Interfaz responsive
- Sistema de base de datos completo
