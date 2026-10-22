# Pro English Academy

Aplicación de agenda con frontend React/Vite, API REST Express y persistencia MySQL. Los roles se distinguen por origen de credenciales: estudiantes en `estudiantes` y recepción en `recepcion`.

## Requisitos

- Node.js 20.19+ o 22.12+
- MySQL con el esquema existente de `database/schema.sql`
- Una cuenta de recepción y cuentas de estudiante creadas en la base
- Contratos activos, salones y lecciones configurados para permitir reservaciones

No hay cuentas ni reservas de prueba incluidas en el frontend. Los hashes bcrypt existentes (incluido costo 12) se validan en el servidor.

## Configuración

Crea `.env` a partir de `.env.example` y configura `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` y una clave aleatoria extensa en `JWT_SECRET`. `CLIENT_ORIGIN` debe coincidir con el origen de Vite y `VITE_API_URL` con la dirección de la API. Nunca publiques `.env`.
La API carga este archivo desde la raíz del proyecto aunque se inicie desde otro directorio.

Si la base ya contiene estas tablas, no vuelvas a ejecutar el DDL completo. El servidor espera `estudiantes`, `recepcion`, `contratos`, `reservas`, `lecciones` y `salones`, con las columnas definidas en `database/schema.sql`.

Instala dependencias y abre dos terminales. Para la demo usa `npm run dev:api:demo`; para desarrollo normal sin autoconfiguración usa `npm run dev:api`:

```sh
npm install
npm run dev:api:demo
npm run dev
```

La API usa `http://localhost:3000` por defecto; la app estará en la URL que Vite muestre (normalmente `http://localhost:5173`). Si el puerto 3000 está ocupado, establece `PORT` para la API y actualiza `VITE_API_URL` en `.env`.

Comprueba `GET /api/health` para verificar que MySQL está conectado. `npm run build` valida el frontend y `npm run lint` ejecuta Oxlint.

Para habilitar las asignaciones diarias de salones, aplica una vez `npm run db:migrate:daily-rooms` después de configurar `.env`. El módulo queda disponible en `/recepcion/asignacion-diaria` y la vista para monitor en `/recepcion/pantalla-tv`.

Para preparar datos de muestra para una revisión, ejecuta `npm run db:seed:demo` en un entorno que no sea producción. El comando conserva las reservas existentes, agrega reservas hasta alcanzar cantidades variadas según las horas semanales de cada estudiante registrado, crea los salones numerados del 1 al 8 si faltan y distribuye los bloques de hoy en salones distintos para la pantalla TV y el editor. Requiere que ya se hayan creado los estudiantes y que la migración diaria esté aplicada; no crea credenciales de prueba.

Si `recepcion` está vacía, configura `BOOTSTRAP_RECEPTION_USERNAME`, `BOOTSTRAP_RECEPTION_NAME` y una contraseña privada de al menos 12 caracteres en `.env`, ejecuta `npm run bootstrap:reception` una sola vez y retira la contraseña del archivo. El comando se niega a crear cuentas si ya existe una. No se incluye un usuario de demostración ni una contraseña predecible.

El comando `npm run dev:api:demo` activa `DEMO_AUTO_SETUP=true`. Después de un login válido de estudiante, la API crea en MySQL un contrato activo de 6 horas semanales (modalidad híbrida, vigencia de un año) solo si ese alumno no tiene uno, además de crear un salón y una lección solo si esas tablas están vacías. El modo normal está deshabilitado por defecto y la preparación nunca se ejecuta con `NODE_ENV=production`. Puedes cambiar las horas con `DEMO_CONTRACT_WEEKLY_HOURS`.

Sin el modo demo, inicia sesión en Recepción y registra al menos un salón y una lección para habilitar reservaciones. Con el modo demo, esos recursos se crean automáticamente en MySQL solo cuando las tablas están vacías. Los estudiantes y contratos existentes se consultan directamente de la base de datos.

## Autenticación y permisos

El login solicita tipo de cuenta, identificador y contraseña. El servidor compara bcrypt y emite JWT con rol. Una contraseña temporal obliga a completar `/actualizar-password`; las rutas de estudiante y recepción están protegidas por rol. Para crear estudiantes desde Recepción, el sistema genera una contraseña temporal y solo la presenta una vez.

## API

- `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/change-password`
- `GET/PATCH /api/student/profile`, `GET /api/student/reservations`, `GET /api/student/availability`
- `GET /api/student/reservations`, `GET /api/student/availability`, `POST/PATCH/DELETE /api/reservations`
- `GET/POST /api/reception/students`, `PATCH/DELETE /api/reception/students/:id`
- `GET/POST /api/reception/rooms`, `PATCH/DELETE /api/reception/rooms/:id`
- `GET/POST /api/reception/lessons`, `PATCH/DELETE /api/reception/lessons/:id`
- `GET/PATCH /api/reception/reservations`
- `GET /api/reception/daily-room-assignments?date=YYYY-MM-DD`, `PUT /api/reception/daily-room-assignments/:date`
- `GET /api/reception/daily-room-assignments/tv?date=YYYY-MM-DD`

Las respuestas de mutación actualizan el estado del cliente; además las vistas vuelven a consultar al entrar en foco y periódicamente para reflejar cambios hechos por el otro rol.
