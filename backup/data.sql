--
-- PostgreSQL database dump
--

-- Dumped from database version 16.8
-- Dumped by pg_dump version 16.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: customer_orders; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.customer_orders (id, customer_id, order_type, frequency, last_order_date, total_orders, average_order_value, preferred_payment_method, status, notes) FROM stdin;
\.


--
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.customers (id, name, address, phone, coordinates, balance, business_name, email) FROM stdin;
1	Ramon Rodriguez	6130 Bergenline Ave	8093240265	2349a9df	0.00	\N	\N
2	Ramon Rodriguez	6130 Bergenline Ave	9193406706		0.00	D'Latinos Beauty Supply	wallymoyaacosta@gmail.com
3	Cliente Prueba	Calle Principal #123	555-0123	\N	0.00	Negocio Test	test@email.com
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.order_items (id, order_id, product_id, quantity, price) FROM stdin;
1	1	1	1	144.00
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.orders (id, customer_id, route_id, total, status, payment_method, date) FROM stdin;
1	1	\N	169.92	pending	cash	2025-03-05 02:29:08.942
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.products (id, name, price, stock) FROM stdin;
1	botellon de agua	144.00	4
2	botellitas	12.00	10
3	Botellón de Agua 5G	100.00	50
4	Botellón de Agua 3G	75.00	30
\.


--
-- Data for Name: routes; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.routes (id, name, driver_id, assistant_id, truck_id, status, date) FROM stdin;
\.


--
-- Data for Name: settings; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.settings (id, name, address, phone, logo, driver_commission, assistant_commission) FROM stdin;
\.


--
-- Data for Name: trucks; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.trucks (id, plate, capacity, status) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.users (id, name, username, password, role, active) FROM stdin;
\.


--
-- Name: customer_orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.customer_orders_id_seq', 1, false);


--
-- Name: customers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.customers_id_seq', 3, true);


--
-- Name: order_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.order_items_id_seq', 1, true);


--
-- Name: orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.orders_id_seq', 1, true);


--
-- Name: products_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.products_id_seq', 4, true);


--
-- Name: routes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.routes_id_seq', 1, false);


--
-- Name: settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.settings_id_seq', 1, false);


--
-- Name: trucks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.trucks_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.users_id_seq', 1, false);


--
-- PostgreSQL database dump complete
--

