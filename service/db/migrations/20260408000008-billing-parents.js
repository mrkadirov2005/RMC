module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TYPE invoice_status AS ENUM ('Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled');
      CREATE TYPE plan_status AS ENUM ('Active', 'Completed', 'Cancelled');
      CREATE TYPE installment_status AS ENUM ('Pending', 'Paid', 'Overdue');
      CREATE TYPE discount_type AS ENUM ('percent', 'fixed');
      CREATE TYPE refund_status AS ENUM ('Requested', 'Approved', 'Rejected', 'Processed');
      CREATE TYPE parent_status AS ENUM ('Active', 'Inactive');

      CREATE TABLE invoices (
          invoice_id SERIAL PRIMARY KEY,
          student_id INT NOT NULL,
          center_id INT NOT NULL,
          invoice_number VARCHAR(50) UNIQUE NOT NULL,
          issue_date DATE NOT NULL,
          due_date DATE,
          status invoice_status DEFAULT 'Draft',
          subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
          discount_total DECIMAL(12,2) NOT NULL DEFAULT 0,
          tax_total DECIMAL(12,2) NOT NULL DEFAULT 0,
          total DECIMAL(12,2) NOT NULL DEFAULT 0,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (student_id) REFERENCES students(student_id),
          FOREIGN KEY (center_id) REFERENCES edu_centers(center_id)
      );

      CREATE TABLE invoice_items (
          invoice_item_id SERIAL PRIMARY KEY,
          invoice_id INT NOT NULL,
          description VARCHAR(200) NOT NULL,
          quantity INT NOT NULL DEFAULT 1,
          unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
          total DECIMAL(12,2) NOT NULL DEFAULT 0,
          FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id) ON DELETE CASCADE
      );
      CREATE INDEX idx_invoices_student ON invoices(student_id, status);

      CREATE TABLE payment_plans (
          plan_id SERIAL PRIMARY KEY,
          student_id INT NOT NULL,
          center_id INT NOT NULL,
          name VARCHAR(100) NOT NULL,
          total_amount DECIMAL(12,2) NOT NULL,
          currency VARCHAR(10) DEFAULT 'USD',
          start_date DATE NOT NULL,
          end_date DATE,
          status plan_status DEFAULT 'Active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (student_id) REFERENCES students(student_id),
          FOREIGN KEY (center_id) REFERENCES edu_centers(center_id)
      );

      CREATE TABLE payment_plan_installments (
          installment_id SERIAL PRIMARY KEY,
          plan_id INT NOT NULL,
          due_date DATE NOT NULL,
          amount DECIMAL(12,2) NOT NULL,
          status installment_status DEFAULT 'Pending',
          paid_payment_id INT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (plan_id) REFERENCES payment_plans(plan_id) ON DELETE CASCADE,
          FOREIGN KEY (paid_payment_id) REFERENCES payments(payment_id)
      );
      CREATE INDEX idx_installments_plan ON payment_plan_installments(plan_id, status);

      CREATE TABLE discounts (
          discount_id SERIAL PRIMARY KEY,
          student_id INT NOT NULL,
          center_id INT NOT NULL,
          discount_type discount_type NOT NULL,
          value DECIMAL(12,2) NOT NULL,
          reason TEXT,
          active BOOLEAN DEFAULT TRUE,
          start_date DATE,
          end_date DATE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (student_id) REFERENCES students(student_id),
          FOREIGN KEY (center_id) REFERENCES edu_centers(center_id)
      );
      CREATE INDEX idx_discounts_student ON discounts(student_id, active);

      CREATE TABLE refunds (
          refund_id SERIAL PRIMARY KEY,
          payment_id INT NOT NULL,
          amount DECIMAL(12,2) NOT NULL,
          reason TEXT,
          status refund_status DEFAULT 'Requested',
          refunded_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (payment_id) REFERENCES payments(payment_id)
      );
      CREATE INDEX idx_refunds_payment ON refunds(payment_id, status);

      CREATE TABLE parents (
          parent_id SERIAL PRIMARY KEY,
          first_name VARCHAR(100) NOT NULL,
          last_name VARCHAR(100) NOT NULL,
          email VARCHAR(150),
          phone VARCHAR(30),
          username VARCHAR(100) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          status parent_status DEFAULT 'Active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE parent_students (
          parent_id INT NOT NULL,
          student_id INT NOT NULL,
          relationship VARCHAR(50) DEFAULT 'Guardian',
          is_primary BOOLEAN DEFAULT FALSE,
          PRIMARY KEY (parent_id, student_id),
          FOREIGN KEY (parent_id) REFERENCES parents(parent_id) ON DELETE CASCADE,
          FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
      );
      CREATE INDEX idx_parent_students_parent ON parent_students(parent_id);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS parent_students CASCADE;
      DROP TABLE IF EXISTS parents CASCADE;
      DROP TABLE IF EXISTS refunds CASCADE;
      DROP TABLE IF EXISTS discounts CASCADE;
      DROP TABLE IF EXISTS payment_plan_installments CASCADE;
      DROP TABLE IF EXISTS payment_plans CASCADE;
      DROP TABLE IF EXISTS invoice_items CASCADE;
      DROP TABLE IF EXISTS invoices CASCADE;
      DROP TYPE IF EXISTS parent_status CASCADE;
      DROP TYPE IF EXISTS refund_status CASCADE;
      DROP TYPE IF EXISTS discount_type CASCADE;
      DROP TYPE IF EXISTS installment_status CASCADE;
      DROP TYPE IF EXISTS plan_status CASCADE;
      DROP TYPE IF EXISTS invoice_status CASCADE;
    `);
  },
};
