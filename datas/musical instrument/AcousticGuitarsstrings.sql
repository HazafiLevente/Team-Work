CREATE DATABASE IF NOT EXISTS datas;
USE datas;

CREATE TABLE IF NOT EXISTS gitarok_akusztikus (
                                                  id INT AUTO_INCREMENT PRIMARY KEY,
                                                  name VARCHAR(255) NOT NULL
    );

INSERT INTO gitarok_akusztikus (name) VALUES
                                          ('Fender FA-115 Dreadnought Natural akusztikus gitárszett'),
                                          ('Ibanez PF15-NT akusztikus gitár'),
                                          ('Epiphone DR-100 Natural akusztikus gitár'),
                                          ('Epiphone Starling Acoustic Player Pack Hot Pink Pearl akusztikus gitárszett'),
                                          ('Taylor GS Mini Mahogany akusztikus gitár'),
                                          ('Ibanez AW54JR-OPN Artwood akusztikus gitár'),
                                          ('Taylor Baby Mahogany BT2 akusztikus gitár');
