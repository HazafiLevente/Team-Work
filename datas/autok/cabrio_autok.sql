CREATE TABLE CabrioAutok (
    ID INT PRIMARY KEY AUTO_INCREMENT,
    MarkaModell VARCHAR(100),
    ArMin INT,
    ArMax INT,
    Kivitel VARCHAR(50),
    LoeroMin INT,
    LoeroMax INT,
    GyorsulasMin DECIMAL(3,1),
    GyorsulasMax DECIMAL(3,1),
    Szemelyek INT,
    Uzemanyag VARCHAR(50),
    Evjarat VARCHAR(20),
    Valto VARCHAR(50)
);

INSERT INTO CabrioAutok (MarkaModell, ArMin, ArMax, Kivitel, LoeroMin, LoeroMax, GyorsulasMin, GyorsulasMax, Szemelyek, Uzemanyag, Evjarat, Valto)
VALUES
('PEUGEOT 206 CC 1.6 16V', 100000, 499999, 'Cabrio', 100, 149, 10.0, 14.9, 4, 'Benzin', '2003-2007', 'Manuális'),
('OPEL TIGRA TT 1.4 16V', 500000, 999999, 'Cabrio', 61, 99, 10.0, 14.9, 2, 'Benzin', '2004-2010', 'Manuális'),
('FORD FOCUS Coupe Cabrio 2.0 TDCi', 1000000, 3900000, 'Cabrio', 100, 149, 10.0, 14.9, 4, 'Dízel', '2008-2009', 'Manuális'),
('AUDI A4 Cabrio 2.0 TFSI', 1000000, 3900000, 'Cabrio', 200, 249, 6.0, 7.9, 4, 'Benzin', '2007-2009', 'Manuális'),
('AUDI A5 CABRIO 3.0 TDI DPF quattro S-tronic', 4000000, 9900000, 'Cabrio', 200, 249, 6.0, 7.9, 4, 'Dízel', '2009-2011', 'Manuális'),
('BMW M235I', 4000000, 9900000, 'Cabrio', 300, 399, 4.0, 5.9, 4, 'Benzin', '2014-', 'Automata'),
('BMW M4 Competition DKG', 10000000, 24900000, 'Cabrio', 400, 499, 4.0, 5.9, 4, 'Benzin', '2017-', 'Automata'),
('FERRARI California 4.3 V8', 25000000, 49900000, 'Cabrio', 400, 499, 4.0, 5.9, 2, 'Benzin', '2009-', 'Automata'),
('MG Cyberster Trophy 77kWh', 25000000, 49900000, 'Cabrio', 300, 399, 4.0, 5.9, 2, 'Elektromos', '2025-', 'Automata'),
('MERCEDES-AMG SL 63 4Matic+ 9G-TRONIC', 50000000, 99900000, 'Cabrio', 500, NULL, NULL, 4.0, 2, 'Benzin', '2022-', 'Automata'),
('FERRARI SF90 SPIDER', 100000000, NULL, 'Cabrio', 500, NULL, NULL, 4.0, 2, 'Benzin', '2021-', 'Automata');
