# Sales Order Viewer

Browse and search sales orders and open any order to see its header details, line items, partners, delivery schedule and follow-on documents.

This app reads and writes SAP data through **MyBTP AI**. The browser never sees SAP or MyBTP credentials:
the included Node backend (`server/`) holds an app key, signs in to your MyBTP AI hub and forwards calls to
`/api/v1/gateway/invoke`. Users sign in with their **MyBTP AI account**; every backend route requires a signed-in user.

## Run locally

```bash
npm install
cp .env.example .env   # add your MyBTP AI app key and a SESSION_SECRET
npm run dev            # UI on http://localhost:5173, backend on http://localhost:8787
```

## Production

```bash
npm run build
npm start              # serves the built UI and the API from one Node process
```

## SAP data used (from MyBTP AI)

| Business object | Entity set | MyBTP API id | Keys |
|---|---|---|---|
| Sales Orders | `SalesOrders` | 2 | SalesOrder |
| Items | `Items` | 2 | SalesOrder, SalesOrderItem |
| Sales Order Schedule Lines | `SalesOrderScheduleLines` | 2 | SalesOrder, SalesOrderItem, ScheduleLine |
| Sales Order Header Partners | `SalesOrderHeaderPartners` | 2 | SalesOrder, PartnerFunction |
| Sales Order Subsequent Process Flows | `SalesOrderSubsequentProcessFlows` | 2 | SalesOrder, DocRelationshipUUID |

## SAP actions

| Action | Call | MyBTP API id |
|---|---|---|
| — | — | — |

## Screens

| Screen | Tab | Route | Type |
|---|---|---|---|
| Sales Orders | Sales Orders | `/sales-orders` | list |
| Sales Order Details | Sales Orders | `/sales-order-details/:id` | record |
| Line Items | Sales Orders | `/line-items` | list |
| Delivery Schedule | Sales Orders | `/delivery-schedule` | list |
| Partners | Sales Orders | `/partners` | list |
| Deliveries & Invoices | Sales Orders | `/deliveries-invoices` | list |

All of the above is declared in `mybtp.config.json`; the browser can only pass the route parameters a screen declares.

## Project layout

- `server/mybtp.ts` – MyBTP AI client (app token, gateway invoke, user verification)
- `server/session.ts` – signed-cookie sessions
- `server/index.ts` – `/api/auth/*`, `/api/screens/:id/rows`, `/api/data/:entity`, `/api/actions/:id`, static hosting
- `src/screens/` – one React component per screen
- `src/components/ui.tsx` – UI building blocks (tables, action runner with confirmation, scan input)
