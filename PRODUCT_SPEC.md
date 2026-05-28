Build a **production-grade full-stack ERP web application for a brick redistribution business** that purchases bricks from factories/bhattas and sells/distributes them to customers through trucks.

The app must be **mobile-first, responsive, fast, offline-capable, multilingual (English/Hindi/Hinglish), cloud hosted with offline sync**, and optimized for both office desktop use and field/mobile usage.

## Business Context

This business buys bricks from factories (bhatta), redistributes them to customers, and manages:

* Factory purchases
* Direct delivery from factory to customer (primary workflow)
* Stock-based selling (secondary workflow)
* Customer payments
* Factory payments
* Truck management
* Driver details
* Finance/accounting
* Expenses
* Reports
* PDF/Excel exports
* Role-based access
* Pending dues
* Profit tracking

---

# Core Business Flows

## 1. Direct Delivery Workflow (Primary)

Factory/Bhatta → Customer

This is the main business flow.

User should be able to:

* Select customer
* Select bhatta/factory
* Select brick class
* Enter quantity (per 1000 bricks)
* Enter purchase price per 1000
* Enter selling price per 1000
* Select truck type:

  * Own truck
  * Third-party truck

If third-party truck:

* truck charges should be separate

If own truck:

* transport should be merged into overall costing

Fields:

* Order date
* Delivery date
* Customer name
* Customer contact
* Factory/Bhatta
* Brick class:

  * 1st Class
  * 2nd Class
  * 3rd Class
* Quantity (per 1000)
* Purchase rate per 1000
* Selling rate per 1000
* Truck number
* Driver name
* Truck owner type
* Delivery location
* Notes

Auto-calculate:

* Total purchase amount
* Total selling amount
* Gross profit
* Net profit
* Pending payment
* Factory payable
* Truck cost
* Margin %

---

## 2. Stock-Based Workflow (Secondary)

Factory → Stock/Yard → Customer

User can bulk purchase bricks and store stock.

Requirements:

* Manual stock batch selection while selling
* No automatic FIFO
* User manually selects purchase batch

Stock purchase:

* Factory
* Brick type
* Quantity
* Purchase price
* Date
* Truck details

While selling:

User manually chooses:

* Which stock batch to use
* Quantity from batch

Stock should reduce automatically.

Dashboard should show:

Current Stock:

* 1st class
* 2nd class
* 3rd class

Stock reports:

* available
* reserved
* sold
* remaining

Low stock alerts.

---

# Pricing Rules

Pricing changes frequently.

System must support:

## Dynamic Factory Pricing

Factory purchase price changes frequently.

Track:

* current price
* historical price

Factory-wise and brick-class-wise.

---

## Dynamic Customer Pricing

Customer-specific negotiated pricing.

Example:

Customer A:
1st class = ₹8500 / 1000

Customer B:
1st class = ₹8200 / 1000

Maintain:

* customer-specific rate history
* previous commitments
* pricing history

---

# Payment & Finance System

## Customer Payment Tracking

Support:

* Advance payment
* Partial payment
* Full payment
* Multiple installments

Every payment entry must include:

* amount
* payment type:

  * advance
  * partial
  * full
* who received/given:

  * owner
  * manager
  * driver
* payment mode:

  * cash
  * UPI
  * bank transfer
  * cheque
* remarks
* date/time
* proof upload (optional)

Auto-calculate:

* pending amount
* overdue
* total paid
* total receivable

Every transaction must be visible in reports and ledger.

---

## Factory/Bhatta Payment Tracking

Support:

* purchase on credit
* partial payments
* multiple installments
* advance payment
* pending dues

Maintain:

* factory ledger
* payable balance
* payment history
* dues aging

---

# Truck Management

Support both:

## Own Trucks

Track:

* truck number
* driver
* fuel expense
* maintenance
* challan/fines
* servicing
* insurance
* permit cost
* salary (future-ready)

Own truck delivery cost should be merged into costing.

---

## Third-Party Trucks

Track:

* truck owner
* vehicle number
* driver
* trip charges
* payment status
* due amount

Truck cost must remain separate.

---

# Finance Dashboard

Create business dashboard with:

* total revenue
* total purchase
* total expenses
* net profit
* gross profit
* receivable amount
* payable amount
* cash flow
* pending customer dues
* pending factory dues
* truck expenses
* monthly analytics
* branch-ready architecture for future

Charts:

* sales trends
* purchase trends
* expense trends
* profit trend
* pending collections

---

# Accounting / Ledger

Date-wise accounting sheet.

Customer ledger:

Date | Order | Debit | Credit | Pending

Factory ledger:

Date | Purchase | Payment | Pending

Truck ledger:

Date | Expense | Payment | Pending

Cashbook:

Date-wise cash movement.

Filter by:

* customer
* factory
* truck
* driver
* date range
* branch (future ready)

---

# GST & Billing

Support both:

### GST Mode

* CGST
* SGST
* IGST
* GSTIN
* GST invoices
* tax reports

### Non-GST Mode

Simple invoice generation.

Generate:

* invoice
* delivery challan
* payment receipt
* transport slip

Include:

* logo
* signature
* business details
* GST details
* QR code
* payment info

---

# Reports

Export PDF and Excel.

Required reports:

* Customer ledger
* Factory ledger
* Daily sales
* Purchase register
* Outstanding dues
* Truck expenses
* Profit & Loss
* GST report
* Order history
* Payment report
* Driver report
* Stock report
* Expense report
* Cash flow statement

Date-wise ordering mandatory.

Filters:

* today
* week
* month
* custom range

---

# Roles & Authorization

Authentication system with RBAC.

### Owner

Full access.

### Manager

Orders + operations + selected finance.

### Accountant

Finance + ledger + reports.

Use secure JWT/session authentication.

Add:

* permission management
* audit logs
* login activity
* role-based routes

---

# Offline Support

Must work with poor internet.

Requirements:

* offline data entry
* local storage/cache
* sync when online
* conflict resolution
* retry failed sync

PWA support mandatory.

---

# Notifications

In-app notifications for:

* pending customer payment
* overdue factory dues
* payment reminders
* low stock alerts

Architecture must be future-ready for:

* WhatsApp integration
* automated reminders

---

# Multi-language

Support:

* English
* Hindi
* Hinglish

Dynamic language switch.

---

# Tech Stack

Build using modern scalable architecture.

Frontend:

* Next.js (latest App Router)
* TypeScript
* TailwindCSS
* ShadCN UI
* React Query
* Zustand
* PWA support

Backend:

* Node.js
* NestJS or Express with TypeScript
* REST APIs
* Validation
* Rate limiting

Database:

* PostgreSQL

ORM:

* Prisma

Authentication:

* JWT + refresh tokens
* Role-based auth

Storage:

* S3-compatible uploads

PDF:

* PDF generation engine

Excel:

* export engine

Realtime:

* websocket-ready architecture

Deployment:

* Dockerized
* cloud-ready
* CI/CD

---

# Database Design

Create a complete scalable schema for:

* users
* roles
* permissions
* customers
* factories/bhatta
* stock batches
* inventory
* orders
* order items
* deliveries
* payments
* payment logs
* truck expenses
* own trucks
* hired trucks
* drivers
* invoices
* challans
* reports
* audit logs
* GST
* settings
* multilingual config

---

# UI/UX Requirements

Must be extremely simple for non-technical staff.

Design goals:

* one-click entry
* large buttons
* mobile optimized
* fast order creation
* easy ledger access
* minimal typing
* searchable dropdowns
* Hindi-friendly UI

Provide:

* responsive dashboard
* dark/light mode
* quick actions
* smart filters
* printable views

---

# Security

Implement:

* RBAC
* audit logs
* soft delete
* encryption
* backups
* activity logs
* input validation
* API security

---

# Deliverables

Generate:

1. Full UI/UX
2. Database schema
3. Backend APIs
4. Authentication
5. Finance engine
6. Stock management logic
7. Ledger/accounting system
8. PDF generation
9. Excel export
10. PWA offline sync
11. Cloud deployment setup
12. Folder architecture
13. Production-ready code
14. Complete documentation
15. Seed data for demo

The code should be modular, scalable, maintainable, and production-ready.
