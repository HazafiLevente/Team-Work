-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.acoustic_drums (
  ID bigint NOT NULL,
  Manufacturer text,
  Model text,
  CONSTRAINT acoustic_drums_pkey PRIMARY KEY (ID)
);
CREATE TABLE public.alt_saxophone (
  ID bigint NOT NULL,
  Manufacturer text,
  Model text,
  Type text,
  CONSTRAINT alt_saxophone_pkey PRIMARY KEY (ID)
);
CREATE TABLE public.bariton_saxophone (
  ID bigint NOT NULL,
  Manufacturer text,
  Model text,
  Type text,
  CONSTRAINT bariton_saxophone_pkey PRIMARY KEY (ID)
);
CREATE TABLE public.bassers (
  ID bigint NOT NULL,
  Manufacturer text,
  Model text,
  CONSTRAINT bassers_pkey PRIMARY KEY (ID)
);
CREATE TABLE public.c_trumpets (
  ID bigint NOT NULL,
  Manufacturer text,
  Model text,
  CONSTRAINT c_trumpets_pkey PRIMARY KEY (ID)
);
CREATE TABLE public.cabrio_cars (
  ID bigint NOT NULL,
  Manufacturer text,
  Model text,
  Price Range (Ft) text,
  Body Type text,
  Horsepower text,
  Acceleration (s) text,
  Seats bigint,
  Fuel Type text,
  Year text,
  Transmission text,
  CONSTRAINT cabrio_cars_pkey PRIMARY KEY (ID)
);
CREATE TABLE public.coupe_cars (
  ID bigint NOT NULL,
  Manufacturer text,
  Model text,
  Price Range (Ft) text,
  Body Type text,
  Horsepower text,
  Acceleration (s) text,
  Seats bigint,
  Fuel Type text,
  Year text,
  Transmission text,
  CONSTRAINT coupe_cars_pkey PRIMARY KEY (ID)
);
CREATE TABLE public.daws (
  ID bigint NOT NULL,
  Manufacturer text,
  Model text,
  CONSTRAINT daws_pkey PRIMARY KEY (ID)
);
CREATE TABLE public.effects_pedal (
  ID bigint NOT NULL,
  Manufacturer text,
  Model text,
  CONSTRAINT effects_pedal_pkey PRIMARY KEY (ID)
);
CREATE TABLE public.egyteru_cars (
  ID bigint NOT NULL,
  Manufacturer text,
  Model text,
  Price Range (Ft) text,
  Body Type text,
  Horsepower text,
  Acceleration (s) text,
  Seats text,
  Fuel Type text,
  Year text,
  Transmission text,
  CONSTRAINT egyteru_cars_pkey PRIMARY KEY (ID)
);
CREATE TABLE public.electric_drums (
  ID bigint NOT NULL,
  Manufacturer text,
  Model text,
  CONSTRAINT electric_drums_pkey PRIMARY KEY (ID)
);
CREATE TABLE public.electric_guitars (
  ID bigint NOT NULL,
  Manufacturer text,
  Model text,
  Guitar text,
  Color text,
  Price bigint,
  CONSTRAINT electric_guitars_pkey PRIMARY KEY (ID)
);
CREATE TABLE public.motherboard (
  ID bigint NOT NULL,
  Manufacturer text,
  Model text,
  Socket text,
  Chipset text,
  FormFactor text,
  RamType text,
  RamSlots bigint,
  RamMaxMHZ bigint,
  RamMaxSizeGB bigint,
  PCIeVersion character varying NOT NULL,
  M2Slots bigint,
  SATAPorts bigint,
  LanSpeed text,
  WiFi text,
  Bluetooth text,
  AudioChip text,
  USBPortsRear bigint,
  RGBSupport text,
  Price bigint,
  CONSTRAINT motherboard_pkey PRIMARY KEY (ID)
);
CREATE TABLE public.multi_effects (
  ID bigint NOT NULL,
  Manufacturer text,
  Model text,
  CONSTRAINT multi_effects_pkey PRIMARY KEY (ID)
);
CREATE TABLE public.pc_details (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  processor_id bigint,
  motherboard_id bigint,
  CONSTRAINT pc_details_pkey PRIMARY KEY (id),
  CONSTRAINT pc_details_processor_id_fkey FOREIGN KEY (processor_id) REFERENCES public.processors(ID),
  CONSTRAINT pc_details_motherboard_id_fkey FOREIGN KEY (motherboard_id) REFERENCES public.motherboard(ID)
);
CREATE TABLE public.processors (
  ID bigint NOT NULL,
  Manufacturer text,
  Model text,
  Threads bigint,
  Clock double precision,
  Socket text,
  Cache bigint,
  Price bigint,
  CONSTRAINT processors_pkey PRIMARY KEY (ID)
);
CREATE TABLE public.setup (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id bigint NOT NULL,
  setup_name text NOT NULL DEFAULT ''::text,
  created_at timestamp with time zone NOT NULL DEFAULT (now() AT TIME ZONE 'utc'::text),
  PC1 bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  CONSTRAINT setup_pkey PRIMARY KEY (id),
  CONSTRAINT setup_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user(ID),
  CONSTRAINT setup_PC1_fkey FOREIGN KEY (PC1) REFERENCES public.pc_details(id)
);
CREATE TABLE public.user (
  ID bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  Name character varying DEFAULT 'EMTPY'::character varying,
  UserName character varying DEFAULT 'EMPTY'::character varying,
  password character varying DEFAULT 'NULL'::character varying,
  Email text,
  MySetup bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  CONSTRAINT user_pkey PRIMARY KEY (ID)
);
CREATE TABLE public.wind_instrument_oils (
  ID bigint NOT NULL,
  Manufacturer text,
  Model text,
  Type text,
  HMany text NOT NULL DEFAULT ''::text,
  CONSTRAINT wind_instrument_oils_pkey PRIMARY KEY (ID)
);
