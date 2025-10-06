CREATE DATABASE IF NOT EXISTS datas;
USE datas;

CREATE TABLE IF NOT EXISTS gitarhurok_elektromos (
                                                     id INT AUTO_INCREMENT PRIMARY KEY,
                                                     name VARCHAR(255) NOT NULL
    );

INSERT INTO gitarhurok_elektromos (name) VALUES
                                             ('Ernie Ball 2221 Nickel Wound Regular Slinky 10-46 elektromos gitárhúr'),
                                             ('Ernie Ball 2223 Nickel Wound Super Slinky 9-42 elektromos gitárhúr'),
                                             ('Ernie Ball 2222 Nickel Wound Hybrid Slinky 9-46 elektromos gitárhúr'),
                                             ('Ernie Ball 2215 Nickel Wound Skinny Top Heavy Bottom Slinky 10-52 elektromos gitárhúr'),
                                             ('Ernie Ball 2220 Nickel Wound Power Slinky 11-48 elektromos gitárhúr'),
                                             ('Ernie Ball 2721 Cobalt Regular Slinky 10-46 elektromos gitárhúr'),
                                             ('Ernie Ball 2723 Cobalt Super Slinky 9-42 elektromos gitárhúr');
