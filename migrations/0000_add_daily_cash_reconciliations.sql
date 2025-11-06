CREATE TABLE "bottle_returns" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"order_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"expected_quantity" integer NOT NULL,
	"returned_quantity" integer DEFAULT 0 NOT NULL,
	"pending_quantity" integer DEFAULT 0 NOT NULL,
	"return_date" timestamp NOT NULL,
	"status" text NOT NULL,
	"amount_charged" numeric(10, 2) DEFAULT '0.00',
	"deposit_amount" numeric(10, 2) DEFAULT '0.00',
	"responsible_type" text,
	"customer_percentage" integer,
	"driver_percentage" integer,
	"charge_method" text,
	"justification" text,
	"last_checked_at" timestamp,
	"automatic_alert" boolean DEFAULT false,
	"manually_assigned" boolean DEFAULT false,
	"assigned_by" integer,
	"assigned_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "cities" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"name" text NOT NULL,
	"municipality_id" integer NOT NULL,
	"code" text NOT NULL,
	CONSTRAINT "cities_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "commission_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"commission_id" integer,
	"order_id" integer,
	"product_id" integer,
	"quantity" integer,
	"commission_value" numeric(10, 2),
	"commission_amount" numeric(10, 2),
	"delivery_date" timestamp
);
--> statement-breakpoint
CREATE TABLE "commissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"user_id" integer,
	"user_role" text,
	"route_id" integer,
	"week_start_date" timestamp,
	"week_end_date" timestamp,
	"product_count" integer,
	"total_amount" numeric(10, 2),
	"status" text DEFAULT 'pending',
	"payment_date" timestamp,
	"payment_reference" text,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "company_leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_name" text NOT NULL,
	"address" text NOT NULL,
	"country" text DEFAULT 'República Dominicana' NOT NULL,
	"manager_name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"approximate_clients" integer DEFAULT 0 NOT NULL,
	"vehicle_count" integer DEFAULT 0 NOT NULL,
	"comments" text,
	"interested_in_plan" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"status" text DEFAULT 'new' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"customer_id" integer NOT NULL,
	"order_type" text NOT NULL,
	"frequency" text NOT NULL,
	"last_order_date" timestamp,
	"total_orders" integer DEFAULT 0 NOT NULL,
	"average_order_value" numeric(10, 2) DEFAULT '0' NOT NULL,
	"preferred_payment_method" text,
	"status" text DEFAULT 'active' NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"logo" text,
	"rnc" text,
	"businessname" text NOT NULL,
	"managername" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"zoneid" integer,
	"street" text NOT NULL,
	"streetnumber" text NOT NULL,
	"provinceid" integer NOT NULL,
	"municipalityid" integer NOT NULL,
	"reference" text,
	"coordinates" text,
	"creditlimit" numeric(10, 2) DEFAULT '0' NOT NULL,
	"balance" numeric(10, 2) DEFAULT '0' NOT NULL,
	"is_charity" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_cash_reconciliations" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"reconciliation_date" timestamp NOT NULL,
	"total_sales" numeric(10, 2) NOT NULL,
	"credit_invoices_total" numeric(10, 2) NOT NULL,
	"cash_invoices_total" numeric(10, 2) NOT NULL,
	"total_payments" numeric(10, 2) NOT NULL,
	"receipts_total" numeric(10, 2) NOT NULL,
	"advances_total" numeric(10, 2) NOT NULL,
	"initial_cash" numeric(10, 2) NOT NULL,
	"expected_cash" numeric(10, 2) NOT NULL,
	"actual_cash" numeric(10, 2) NOT NULL,
	"lost_water_gallons" numeric(10, 2) DEFAULT '0' NOT NULL,
	"water_price_per_gallon" numeric(10, 2) DEFAULT '0' NOT NULL,
	"lost_water_value" numeric(10, 2) DEFAULT '0' NOT NULL,
	"surplus" numeric(10, 2) DEFAULT '0' NOT NULL,
	"shortage" numeric(10, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "daily_cash_reconciliations_company_id_reconciliation_date_unique" UNIQUE("company_id","reconciliation_date")
);
--> statement-breakpoint
CREATE TABLE "driver_cash_balances" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"driver_id" integer NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"initial_balance" numeric(10, 2) DEFAULT '0.00',
	"cash_in" numeric(10, 2) DEFAULT '0.00',
	"cash_out" numeric(10, 2) DEFAULT '0.00',
	"final_balance" numeric(10, 2) DEFAULT '0.00',
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "invoice_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"invoice_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"quantity" integer NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"total" numeric(10, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"invoice_number" integer NOT NULL,
	"customer_id" integer NOT NULL,
	"subtotal" numeric(10, 2) NOT NULL,
	"tax" numeric(10, 2) NOT NULL,
	"total" numeric(10, 2) NOT NULL,
	"status" text NOT NULL,
	"payment_method" text NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"notes" text,
	CONSTRAINT "invoices_company_id_invoice_number_unique" UNIQUE("company_id","invoice_number")
);
--> statement-breakpoint
CREATE TABLE "location_capture_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"customer_id" integer NOT NULL,
	"company_id" integer NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "location_capture_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "municipalities" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"province_id" integer NOT NULL,
	"type" text NOT NULL,
	CONSTRAINT "municipalities_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"order_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"quantity" integer NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"total" numeric(10, 2)
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"customer_id" integer NOT NULL,
	"route_id" integer,
	"invoice_id" integer,
	"total" numeric(10, 2) NOT NULL,
	"status" text NOT NULL,
	"payment_method" text NOT NULL,
	"date" timestamp NOT NULL,
	"estimated_delivery_time" timestamp,
	"actual_delivery_time" timestamp,
	"delivery_sequence" integer,
	"delivery_coordinates" text,
	"notes" text,
	"cash_collected" numeric(10, 2) DEFAULT '0.00',
	"driver_commission" numeric(10, 2) DEFAULT '0.00',
	"assistant_commission" numeric(10, 2) DEFAULT '0.00',
	"delivered_by" integer,
	"bottles_not_returned" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"invoice_id" integer,
	"customer_id" integer NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"payment_method" text NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"reference" text,
	"notes" text,
	"is_advance" boolean DEFAULT false NOT NULL,
	"document_number" text
);
--> statement-breakpoint
CREATE TABLE "production_batch_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"batch_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"quantity" integer NOT NULL,
	"cost" numeric(10, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "production_batches" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"batch_number" text NOT NULL,
	"warehouse_id" integer NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"notes" text,
	"status" text DEFAULT 'completed' NOT NULL,
	"total_cost" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	CONSTRAINT "production_batches_batch_number_unique" UNIQUE("batch_number")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"name" text NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"icon" text,
	"is_returnable" boolean DEFAULT false NOT NULL,
	"deposit_amount" numeric(10, 2) DEFAULT '0.00',
	"has_commission" boolean DEFAULT true NOT NULL,
	"is_commissionable" boolean DEFAULT false,
	"driver_commission_value" numeric(10, 2) DEFAULT '0',
	"helper_commission_value" numeric(10, 2) DEFAULT '0'
);
--> statement-breakpoint
CREATE TABLE "provinces" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	CONSTRAINT "provinces_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "recurring_order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"recurring_order_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"quantity" integer NOT NULL,
	"price" numeric(10, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recurring_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"customer_id" integer NOT NULL,
	"name" text NOT NULL,
	"frequency" text NOT NULL,
	"day_of_week" integer,
	"day_of_month" integer,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"last_generated_date" timestamp,
	"next_generation_date" timestamp,
	"status" text DEFAULT 'active' NOT NULL,
	"total_amount" numeric(10, 2) NOT NULL,
	"payment_method" text NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "returned_bottles" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"order_id" integer,
	"product_id" integer,
	"quantity" integer NOT NULL,
	"return_date" timestamp NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "route_settlement_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"settlement_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"loaded_quantity" integer NOT NULL,
	"returned_quantity" integer DEFAULT 0 NOT NULL,
	"sold_quantity" integer DEFAULT 0 NOT NULL,
	"difference" integer DEFAULT 0 NOT NULL,
	"returned_containers" integer DEFAULT 0,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "route_settlements" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"vehicle_loading_id" integer NOT NULL,
	"settlement_date" timestamp DEFAULT now() NOT NULL,
	"total_cash_received" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"total_credit_received" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"total_invoiced" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"cash_difference" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "routes" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"name" text NOT NULL,
	"driver_id" integer NOT NULL,
	"assistant_id" integer,
	"truck_id" integer,
	"zone_id" integer,
	"status" text NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"start_time" timestamp,
	"end_time" timestamp,
	"estimated_duration" integer,
	"actual_duration" integer,
	"total_distance" numeric(10, 2),
	"total_revenue" numeric(10, 2),
	"delivery_sequence" text[],
	"current_location" text,
	"last_update" timestamp,
	"driver_started_at" timestamp,
	"driver_ended_at" timestamp,
	"is_completed" boolean DEFAULT false NOT NULL,
	"stops" text[],
	"comments" text
);
--> statement-breakpoint
CREATE TABLE "sectors" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"name" text NOT NULL,
	"city_id" integer NOT NULL,
	"code" text NOT NULL,
	CONSTRAINT "sectors_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"logo" text,
	"name" text NOT NULL,
	"rnc" text,
	"street" text NOT NULL,
	"street_number" text NOT NULL,
	"province_id" integer NOT NULL,
	"municipality_id" integer NOT NULL,
	"contact_phone" text NOT NULL,
	"email" text,
	"country" text NOT NULL,
	"currency" text NOT NULL,
	"tax" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"latitude" numeric(10, 6),
	"longitude" numeric(10, 6)
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"document_type" text NOT NULL,
	"document_number" text NOT NULL,
	"customer_id" integer,
	"invoice_id" integer,
	"payment_id" integer,
	"amount" numeric(10, 2) NOT NULL,
	"type" text NOT NULL,
	"category" text,
	"description" text NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"reference" text,
	"notes" text,
	"created_by" integer,
	CONSTRAINT "transactions_company_id_document_type_document_number_unique" UNIQUE("company_id","document_type","document_number")
);
--> statement-breakpoint
CREATE TABLE "trucks" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"brand" text NOT NULL,
	"model" text NOT NULL,
	"year" text NOT NULL,
	"plate" text NOT NULL,
	"color" text NOT NULL,
	"capacity" text NOT NULL,
	"status" text DEFAULT 'disponible' NOT NULL,
	CONSTRAINT "trucks_plate_unique" UNIQUE("plate")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"name" text NOT NULL,
	"username" text NOT NULL,
	"email" text,
	"password" text NOT NULL,
	"role" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"phone" text,
	"license" text,
	"license_expiry" timestamp,
	"hire_date" timestamp DEFAULT now() NOT NULL,
	"emergency_contact" text,
	"current_location" text,
	"last_location_update" timestamp,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "vehicle_loading" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"loading_number" serial NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"truck_id" integer NOT NULL,
	"driver_id" integer NOT NULL,
	"assistant_id" integer,
	"route_id" integer,
	"status" text DEFAULT 'pending' NOT NULL,
	"initial_cash" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"cash_total" numeric(10, 2) DEFAULT '0.00',
	"transfer_total" numeric(10, 2) DEFAULT '0.00',
	"total_invoiced" numeric(10, 2) DEFAULT '0.00',
	"difference" numeric(10, 2) DEFAULT '0.00',
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	CONSTRAINT "vehicle_loading_loading_number_unique" UNIQUE("loading_number")
);
--> statement-breakpoint
CREATE TABLE "vehicle_loading_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"loading_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"quantity" integer NOT NULL,
	"returned_quantity" integer DEFAULT 0,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "warehouses" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"code" serial NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "warehouses_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "zones" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"name" text NOT NULL,
	"color" text NOT NULL,
	"coordinates" text[] NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bottle_returns" ADD CONSTRAINT "bottle_returns_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bottle_returns" ADD CONSTRAINT "bottle_returns_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bottle_returns" ADD CONSTRAINT "bottle_returns_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cities" ADD CONSTRAINT "cities_municipality_id_municipalities_id_fk" FOREIGN KEY ("municipality_id") REFERENCES "public"."municipalities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_items" ADD CONSTRAINT "commission_items_commission_id_commissions_id_fk" FOREIGN KEY ("commission_id") REFERENCES "public"."commissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_items" ADD CONSTRAINT "commission_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_items" ADD CONSTRAINT "commission_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_zoneid_zones_id_fk" FOREIGN KEY ("zoneid") REFERENCES "public"."zones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_provinceid_provinces_id_fk" FOREIGN KEY ("provinceid") REFERENCES "public"."provinces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_municipalityid_municipalities_id_fk" FOREIGN KEY ("municipalityid") REFERENCES "public"."municipalities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_cash_reconciliations" ADD CONSTRAINT "daily_cash_reconciliations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_cash_balances" ADD CONSTRAINT "driver_cash_balances_driver_id_users_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location_capture_tokens" ADD CONSTRAINT "location_capture_tokens_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "municipalities" ADD CONSTRAINT "municipalities_province_id_provinces_id_fk" FOREIGN KEY ("province_id") REFERENCES "public"."provinces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_batch_items" ADD CONSTRAINT "production_batch_items_batch_id_production_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."production_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_batch_items" ADD CONSTRAINT "production_batch_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_order_items" ADD CONSTRAINT "recurring_order_items_recurring_order_id_recurring_orders_id_fk" FOREIGN KEY ("recurring_order_id") REFERENCES "public"."recurring_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_order_items" ADD CONSTRAINT "recurring_order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_orders" ADD CONSTRAINT "recurring_orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "returned_bottles" ADD CONSTRAINT "returned_bottles_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "returned_bottles" ADD CONSTRAINT "returned_bottles_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "route_settlement_items" ADD CONSTRAINT "route_settlement_items_settlement_id_route_settlements_id_fk" FOREIGN KEY ("settlement_id") REFERENCES "public"."route_settlements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "route_settlement_items" ADD CONSTRAINT "route_settlement_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "route_settlements" ADD CONSTRAINT "route_settlements_vehicle_loading_id_vehicle_loading_id_fk" FOREIGN KEY ("vehicle_loading_id") REFERENCES "public"."vehicle_loading"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routes" ADD CONSTRAINT "routes_driver_id_users_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routes" ADD CONSTRAINT "routes_assistant_id_users_id_fk" FOREIGN KEY ("assistant_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routes" ADD CONSTRAINT "routes_truck_id_trucks_id_fk" FOREIGN KEY ("truck_id") REFERENCES "public"."trucks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routes" ADD CONSTRAINT "routes_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sectors" ADD CONSTRAINT "sectors_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_province_id_provinces_id_fk" FOREIGN KEY ("province_id") REFERENCES "public"."provinces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_municipality_id_municipalities_id_fk" FOREIGN KEY ("municipality_id") REFERENCES "public"."municipalities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_loading" ADD CONSTRAINT "vehicle_loading_truck_id_trucks_id_fk" FOREIGN KEY ("truck_id") REFERENCES "public"."trucks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_loading" ADD CONSTRAINT "vehicle_loading_driver_id_users_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_loading" ADD CONSTRAINT "vehicle_loading_assistant_id_users_id_fk" FOREIGN KEY ("assistant_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_loading" ADD CONSTRAINT "vehicle_loading_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_loading_items" ADD CONSTRAINT "vehicle_loading_items_loading_id_vehicle_loading_id_fk" FOREIGN KEY ("loading_id") REFERENCES "public"."vehicle_loading"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_loading_items" ADD CONSTRAINT "vehicle_loading_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;