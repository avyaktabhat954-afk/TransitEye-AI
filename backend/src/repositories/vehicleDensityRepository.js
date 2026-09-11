/**
 * In-memory Vehicle Density Repository
 * Provides an abstracted persistence layer for vehicle density observations.
 * Can be swapped for a Supabase/PostGIS repository without altering services/controllers.
 */

class InMemoryVehicleDensityRepository {
  constructor() {
    this.records = [];
  }

  async create(record) {
    this.records.push(record);
    return { ...record };
  }

  async findAll() {
    return this.records.map((r) => ({ ...r }));
  }

  async findById(id) {
    const item = this.records.find((r) => r.id === id);
    return item ? { ...item } : null;
  }

  async clear() {
    this.records = [];
  }
}

module.exports = new InMemoryVehicleDensityRepository();
