--liquibase formatted sql

--changeset shubham:main_1.1 labels:main_tables
CREATE TABLE kognitos_words
(
    id            SERIAL PRIMARY KEY,
    request_id    UUID         NOT NULL,
    original_word VARCHAR(255) NOT NULL,
    search_key    VARCHAR(255) NOT NULL,
    created_on    TIMESTAMP WITHOUT TIME ZONE DEFAULT (now()),
    CONSTRAINT kognitos_words__request_id UNIQUE (request_id)
);
--rollback DROP TABLE kognitos_words;
--changeset shubham:main_1.2 labels:main_tables
CREATE INDEX kognitos_words__search_key ON kognitos_words (search_key);
--rollback DROP INDEX kognitos_words__search_key;