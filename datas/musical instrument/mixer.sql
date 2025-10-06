CREATE DATABASE IF NOT EXISTS datas;
USE datas;

CREATE TABLE IF NOT EXISTS keverok (
                                       id INT AUTO_INCREMENT PRIMARY KEY,
                                       name VARCHAR(255) NOT NULL
    );

INSERT INTO keverok (name) VALUES
                               ('Behringer X AIR XR18 Digitális keverő'),
                               ('Behringer PMP 4000 Keverőerősítő'),
                               ('Behringer XENYX QX1204 USB Keverő'),
                               ('Midas MR18 Digitális keverő'),
                               ('Behringer PMP 6000 Keverőerősítő'),
                               ('Rode RODECaster Pro II Black Podcast keverő'),
                               ('Midas M32R LIVE Digitális keverő'),
                               ('Behringer XENYX X 2222 USB Keverő'),
                               ('Behringer SX2442FX-EU Keverő'),
                               ('TC Helicon GoXLR White White Podcast keverő');
