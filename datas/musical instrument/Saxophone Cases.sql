CREATE DATABASE IF NOT EXISTS datas;
USE datas;

CREATE TABLE IF NOT EXISTS szaxofon_tokok (
                                              id INT AUTO_INCREMENT PRIMARY KEY,
                                              name VARCHAR(255) NOT NULL
    );

INSERT INTO szaxofon_tokok (name) VALUES
                                      ('Gator GL-TENOR Szaxofon tok'),
                                      ('BAM 4011SNN Cabine Szaxofon tok Black'),
                                      ('SKB Cases 1SKB-450 Tenor Szaxofon tok');
