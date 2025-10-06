CREATE DATABASE IF NOT EXISTS datas;
USE datas;

CREATE TABLE IF NOT EXISTS dobok_elektromos (
                                                id INT AUTO_INCREMENT PRIMARY KEY,
                                                name VARCHAR(255) NOT NULL
    );

INSERT INTO dobok_elektromos (name) VALUES
                                        ('Nux DM-210 Elektromos dobszett'),
                                        ('Roland TD-07DMK V-Drums elektromos dobszett'),
                                        ('Alesis Turbo Mesh Kit elektromos dobszett'),
                                        ('Roland TD-50KV2 V-Drums elektromos dobszett'),
                                        ('Roland VAD504 V-Drums Acoustic Design elektromos dobszett'),
                                        ('Alesis Nitro Max Kit elektromos dobszett');
