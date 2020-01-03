CREATE TABLE concerts (
	title TEXT NOT NULL,
	venue VARCHAR(255) NOT NULL,
	url TEXT,
	date_and_time TIMESTAMPTZ NOT NULL,
	price MONEY,
	PRIMARY KEY(title, venue, date_and_time)
);

INSERT INTO concerts (title, venue, url, date_and_time, price) 
VALUES ('Dummy concert', 'Dummy venue', 'www.testing.com', '2016-06-22 19:10:25-07', 23.32);