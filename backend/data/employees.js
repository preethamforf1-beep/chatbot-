import { getEmployees } from '../db/repository.js';

const employees = getEmployees();

export { employees };
