CREATE TABLE concerts (
	title TEXT NOT NULL,
	venue VARCHAR(255) NOT NULL,
	url TEXT,
	date_and_time TIMESTAMPTZ NOT NULL,
	price MONEY,
	PRIMARY KEY(title, venue, date_and_time)
);

CREATE TABLE users (
	email TEXT NOT NULL,
	created_at TIMESTAMPTZ NOT NULL,
	loc TEXT NOT NULL,
	PRIMARY KEY (email)
);