/**
 * In-memory Incident Repository
 * Provides an abstracted persistence layer for incidents / ANPR records during prototype phases.
 * Can be swapped for a Supabase/PostGIS repository without altering services/controllers.
 */

class InMemoryIncidentRepository {
  constructor() {
    this.incidents = [];
  }

  async create(incident) {
    this.incidents.push(incident);
    return { ...incident };
  }

  async findAll() {
    return this.incidents.map((inc) => ({ ...inc }));
  }

  async findById(id) {
    const item = this.incidents.find((inc) => inc.id === id);
    return item ? { ...item } : null;
  }

  async clear() {
    this.incidents = [];
  }
}

module.exports = new InMemoryIncidentRepository();
