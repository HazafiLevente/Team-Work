CREATE DATABASE IF NOT EXISTS datas;
USE datas;

CREATE TABLE IF NOT EXISTS dobok_akusztikus (
                                                id INT AUTO_INCREMENT PRIMARY KEY,
                                                name VARCHAR(255) NOT NULL
    );

INSERT INTO dobok_akusztikus (name) VALUES
                                        ('Yamaha Stage Custom Hip Natural Wood akusztikus dobszett'),
                                        ('TAMA MBS42S-SKA Starclassic Performer akusztikus dobszett'),
                                        ('TAMA IP50H6WBN-BOB Imperialstar akusztikus dobszett'),
                                        ('TAMA CK52KR-ICA Superstar Classic akusztikus dobszett'),
                                        ('TAMA IP52H6W-CTW Imperialstar akusztikus dobszett'),
                                        ('Yamaha Stage Custom Birch SBP2F5 Honey Amber akusztikus dobszett + HW780 állványzat'),
                                        ('TAMA CL52KR-BAB Superstar akusztikus dobszett - bemutató darab'),
                                        ('TAMA IP50H6W-HBK Imperialstar akusztikus dobszett');
