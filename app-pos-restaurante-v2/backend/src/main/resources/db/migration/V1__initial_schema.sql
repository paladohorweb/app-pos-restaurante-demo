CREATE TABLE products (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  category VARCHAR(60) NOT NULL,
  description VARCHAR(500),
  price DECIMAL(12,2) NOT NULL,
  image_url VARCHAR(255),
  available BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE restaurant_tables (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  area VARCHAR(50) NOT NULL,
  capacity INT NOT NULL,
  status VARCHAR(20) NOT NULL,
  guests INT,
  opened_at DATETIME(6)
);

CREATE TABLE reservations (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  customer_name VARCHAR(120) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  reservation_date DATE NOT NULL,
  reservation_time TIME NOT NULL,
  guests INT NOT NULL,
  area VARCHAR(50) NOT NULL,
  table_id BIGINT,
  occasion VARCHAR(80),
  notes VARCHAR(600),
  status VARCHAR(20) NOT NULL,
  created_at DATETIME(6) NOT NULL,
  CONSTRAINT fk_reservation_table FOREIGN KEY (table_id) REFERENCES restaurant_tables(id),
  INDEX idx_reservation_slot (reservation_date, reservation_time)
);

CREATE TABLE customer_orders (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  table_id BIGINT NOT NULL,
  waiter VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL,
  created_at DATETIME(6) NOT NULL,
  paid_at DATETIME(6),
  CONSTRAINT fk_order_table FOREIGN KEY (table_id) REFERENCES restaurant_tables(id)
);

CREATE TABLE order_items (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  product_name VARCHAR(120) NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  quantity INT NOT NULL,
  notes VARCHAR(400),
  CONSTRAINT fk_item_order FOREIGN KEY (order_id) REFERENCES customer_orders(id),
  CONSTRAINT fk_item_product FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE payments (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  table_id BIGINT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  method VARCHAR(20) NOT NULL,
  created_at DATETIME(6) NOT NULL,
  CONSTRAINT fk_payment_table FOREIGN KEY (table_id) REFERENCES restaurant_tables(id)
);
