CREATE DATABASE IF NOT EXISTS datas;
USE datas;

CREATE TABLE IF NOT EXISTS fuvos_hangszer_kremek_es_olajok (
                                                               id INT AUTO_INCREMENT PRIMARY KEY,
                                                               name VARCHAR(255) NOT NULL
    );

INSERT INTO fuvos_hangszer_kremek_es_olajok (name) VALUES
                                                       ('Yamaha BMMSLIDEOIL03 Olaj/krém fúvós hangszerekre 30 ml'),
                                                       ('Yamaha BMMVALVEOILREG3 Olaj/krém fúvós hangszerekre 60 ml'),
                                                       ('La Tromba 493510 Olaj/krém fúvós hangszerekre');
