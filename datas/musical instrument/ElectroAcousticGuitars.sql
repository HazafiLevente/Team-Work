CREATE DATABASE IF NOT EXISTS datas;
USE datas;

CREATE TABLE IF NOT EXISTS gitarok_elektro_akusztikus (
                                                          id INT AUTO_INCREMENT PRIMARY KEY,
                                                          name VARCHAR(255) NOT NULL
    );

INSERT INTO gitarok_elektro_akusztikus (name) VALUES
                                                  ('Ibanez PF12MHCE-OPN elektro-akusztikus gitár'),
                                                  ('Fender American Acoustasonic Stratocaster EB Black elektro-akusztikus gitár'),
                                                  ('Yamaha FG-TA TransAcoustic Brown Sunburst elektro-akusztikus gitár'),
                                                  ('Cort Jade Classic PPOP elektro-akusztikus gitár'),
                                                  ('Fender Acoustasonic Player Telecaster RW Arctic White elektro-akusztikus gitár'),
                                                  ('D''Angelico Premier Gramercy LS Satin Vintage Sunburst elektro-akusztikus gitár'),
                                                  ('Fender Tim Armstrong Hellcat WN Natural 12-húros elektro-akusztikus gitár');
