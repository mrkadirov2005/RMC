const common = require('./common.dto');
const students = require('./students.dto');
const teachers = require('./teachers.dto');
const classes = require('./classes.dto');
const payments = require('./payments.dto');
const debts = require('./debts.dto');
const discounts = require('./discounts.dto');
const refunds = require('./refunds.dto');
const invoices = require('./invoices.dto');
const payment_plans = require('./payment-plans.dto');
const parents = require('./parents.dto');
const centers = require('./centers.dto');
const search = require('./search.dto');
const grades = require('./grades.dto');
const imports = require('./imports.dto');
const notifications = require('./notifications.dto');
const saved_filters = require('./saved-filters.dto');
const tests = require('./tests.dto');
const attendance = require('./attendance.dto');
const superusers = require('./superusers.dto');

module.exports = {
  ...common,
  ...students,
  ...teachers,
  ...classes,
  ...payments,
  ...debts,
  ...discounts,
  ...refunds,
  ...invoices,
  ...payment_plans,
  ...parents,
  ...centers,
  ...search,
  ...grades,
  ...imports,
  ...notifications,
  ...saved_filters,
  ...tests,
  ...attendance,
  ...superusers,
};

export {};
