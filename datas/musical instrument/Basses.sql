CREATE DATABASE IF NOT EXISTS datas;
USE datas;

CREATE TABLE IF NOT EXISTS basszerek (
                                         id INT AUTO_INCREMENT PRIMARY KEY,
                                         name VARCHAR(255) NOT NULL
    );

INSERT INTO basszerek (name) VALUES
                                 ('Ibanez GSRM20B WNF'),
                                 ('Ibanez GSR180 LBF'),
                                 ('Jackson JS Series Concert Bass Minion JS1X Satin Black'),
                                 ('Jackson JS2 Spectra Snow White'),
                                 ('Ibanez GSR200 TR'),
                                 ('Ibanez GSR280QA TMS'),
                                 ('LTD B-15KIT BLKS'),
                                 ('Ibanez GSR205B WK'),
                                 ('Jackson JS Series Spectra Bass JS3V Walnut Stain'),
                                 ('Ibanez SR305EB WK'),
                                 ('Ibanez SR305E PW');
