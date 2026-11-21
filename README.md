# Orders API

Microservicio de órdenes implementado con Node.js, NestJS y PostgreSQL para el
taller de benchmarking con JMeter.

## Requisitos

- Node.js 22+ y npm
- Docker con Docker Compose
- Apache JMeter (para ejecutar las pruebas)

## Ejecutar con Docker Compose

```bash
docker compose up --build -d
docker compose ps
```

La API queda disponible en `http://localhost:5001` y PostgreSQL en el puerto
`5433` del host. El esquema se crea al iniciar la base de datos por primera
vez.

## Ejecutar localmente

Arranca PostgreSQL (por ejemplo, con `docker compose up -d db`) y ejecuta:

```bash
npm ci
DB_PORT=5433 npm run start:dev
```

La aplicación lee `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` y
`PORT`. Los valores predeterminados son `localhost`, `5432`, `postgres`,
`postgres`, `orders_db` y `5001`, respectivamente.

## Crear una orden

`POST /api/orders`:

```json
{
  "customerId": "C123",
  "items": [
    { "productId": "P1", "quantity": 2, "price": 10.5 },
    { "productId": "P2", "quantity": 1, "price": 5.0 }
  ]
}
```

Respuesta (`201 Created`):

```json
{
  "orderId": "d6ad70e0-8d16-4f38-86ad-39c88d14660d",
  "totalAmount": 26,
  "itemsCount": 3,
  "processedAt": "2026-11-20T00:00:00.000Z"
}
```

`itemsCount` es la suma de las cantidades. Los importes se calculan y guardan
con precisión de centavos. Las escrituras en `orders` y `order_items` se hacen
en una transacción.

Ejemplo con `curl`:

```bash
curl -i http://localhost:5001/api/orders \
  -H 'Content-Type: application/json' \
  -d '{"customerId":"C123","items":[{"productId":"P1","quantity":2,"price":10.5},{"productId":"P2","quantity":1,"price":5}]}'
```

La API rechaza órdenes vacías, tipos inválidos y propiedades no declaradas.

## Pruebas de carga con JMeter

Abre `benchmark/orders.jmx` en JMeter. El plan incluye `Content-Type:
application/json`, la petición POST, Summary Report y Aggregate Report. Para
correrlo en modo no gráfico:

```bash
mkdir -p results
jmeter -n -t benchmark/orders.jmx -JUSERS=10 -JRAMP_SECONDS=5 \
  -JDURATION_SECONDS=60 -l results/load-10.jtl -e -o results/report-10
```

Repite para 50 y 100 usuarios cambiando `USERS` y los nombres de salida.
Para el escenario de estrés, aumenta `USERS` de 20 en 20 hasta observar
latencias, errores o timeouts. Las carpetas de resultados se ignoran en Git.
Registra de cada escenario el promedio, P95, throughput y porcentaje de
errores; añade las capturas requeridas y el monitoreo de `htop` y `docker stats`
al informe. Los valores finales del taller (10, 50 y 100) se usan aquí frente
a los valores iniciales de ejemplo (20, 70 y 150).
# NodeNestjs
