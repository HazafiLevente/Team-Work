CREATE DATABASE IF NOT EXISTS datas;
USE datas;

CREATE TABLE IF NOT EXISTS szaxofon_szopran_genyo_hazikacsi (
                                                                id INT AUTO_INCREMENT PRIMARY KEY,
                                                                name VARCHAR(255) NOT NULL
    );

INSERT INTO szaxofon_szopran_genyo_hazikacsi (name) VALUES
                                                        ('Latone LSS 500 Silver Elegance Szoprán szaxofon'),
                                                        ('Latone LSS 610 Antique Brass Szoprán szaxofon'),
                                                        ('Latone LSS 630 Classic Gold Szoprán szaxofon');
