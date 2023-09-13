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
--changeset shubham:main_1.3 labels:main_tables
CREATE TABLE kognitos_aggregate_word_counts
(
    id            SERIAL PRIMARY KEY,
    search_key    VARCHAR(255) NOT NULL,
    count         BIGINT,
    created_on    TIMESTAMP WITHOUT TIME ZONE DEFAULT (now()),
    updated_on    TIMESTAMP WITHOUT TIME ZONE DEFAULT (now()),
    CONSTRAINT kognitos_aggregate_word_counts__search_key UNIQUE (search_key)
);
--rollback DROP TABLE kognitos_aggregate_word_counts;
--changeset shubham:main_1.4 labels:main_tables endDelimiter:\nGO
CREATE FUNCTION auto_increament_search_key_count() 
RETURNS TRIGGER 
AS 
$$
DECLARE
BEGIN
INSERT INTO kognitos_aggregate_word_counts(search_key, count) VALUES(NEW.search_key, 0) 
ON CONFLICT(search_key) DO NOTHING;
UPDATE kognitos_aggregate_word_counts SET count=count+1, updated_on=now() WHERE search_key=NEW.search_key;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
GO
--rollback DROP FUNCTION auto_increament_search_key_count
--changeset shubham:main_1.5 labels:main_tables
CREATE TRIGGER ta_kognitos_words_update_search_key_count AFTER INSERT
ON kognitos_words FOR EACH ROW EXECUTE PROCEDURE auto_increament_search_key_count();
--rollback DROP TRIGGER IF EXISTS ta_kognitos_words_update_search_key_count ON kognitos_words