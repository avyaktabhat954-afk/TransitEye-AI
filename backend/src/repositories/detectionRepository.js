/**
 * In-memory Detection Repository
 * Provides an abstracted persistence layer for detections during prototype phases.
 * Can be swapped for a Supabase/PostGIS repository without altering services/controllers.
 */

class InMemoryDetectionRepository {
  constructor() {
    this.detections = [];
  }

  async create(detection) {
    this.detections.push(detection);
    return { ...detection };
  }

  async findAll() {
    return this.detections.map((d) => ({ ...d }));
  }

  async findById(id) {
    const item = this.detections.find((d) => d.id === id);
    return item ? { ...item } : null;
  }

  async clear() {
    this.detections = [];
  }
}

// Export singleton instance for app runtime
module.exports = new InMemoryDetectionRepository();
