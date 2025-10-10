USE datas;
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

