SET client_encoding = 'UTF8';
\copy inventory_items FROM 'database/inventory_items_export.csv' WITH (FORMAT csv, HEADER true, NULL 'null')