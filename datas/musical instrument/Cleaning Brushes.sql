CREATE DATABASE IF NOT EXISTS datas;
USE datas;

CREATE TABLE IF NOT EXISTS tisztitokefek (
                                             id INT AUTO_INCREMENT PRIMARY KEY,
                                             name VARCHAR(255) NOT NULL
    );

INSERT INTO tisztitokefek (name) VALUES
                                     ('Yamakawa RA-S12 Tisztítókefe'),
                                     ('Hohner TM80001 Tisztítókefe'),
                                     ('Hohner TM8005 Tisztítókefe');
