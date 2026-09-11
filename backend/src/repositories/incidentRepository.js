/**
 * Incident Repository
 *
 * Provides persistence for incidents / ANPR records.
 * Production/application runtime strictly requires Supabase/PostGIS.
 * In-memory repository is retained for explicit test usage only.
 *
 * Invariant: location JSONB is stored directly; the PostGIS `geom`
 * column is populated/updated automatically by a database trigger.
 * Repositories must NOT send `geom` in write payloads.
 */

const { supabase, supabaseEnabled } = require("../config/supabaseClient");

class InMemoryIncidentRepository {
  constructor() {
    this.incidents = [];
  }

  async create(incident) {
    this.incidents.push(incident);
    return { ...incident };
  }

  async findAll(options = {}) {
    let list = this.incidents.map((inc) => ({ ...inc }));

    if (options.bus_id) list = list.filter((inc) => inc.bus_id === options.bus_id);
    if (options.trigger_reason) list = list.filter((inc) => inc.trigger_reason === options.trigger_reason);
    if (options.since) list = list.filter((inc) => new Date(inc.timestamp) >= new Date(options.since));
    if (options.until) list = list.filter((inc) => new Date(inc.timestamp) <= new Date(options.until));

    list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const total = list.length;
    const limit = Number.isInteger(options.limit) ? options.limit : 50;
    const offset = Number.isInteger(options.offset) ? options.offset : 0;

    const result = list.slice(offset, offset + limit);
    result.total = total;
    result.limit = limit;
    result.offset = offset;
    return result;
  }

  async findById(id) {
    const item = this.incidents.find((inc) => inc.id === id);
    return item ? { ...item } : null;
  }

  async clear() {
    this.incidents = [];
  }
}

class SupabaseIncidentRepository {
  constructor(client = supabase) {
    if (!client) {
      throw new Error(
        "[TransitEye Configuration Error] Supabase is required for application runtime, " +
          "but the Supabase client is not initialized. Check SUPABASE_URL and SUPABASE_SECRET_KEY in .env. " +
          "Silent in-memory fallback is disabled in application mode."
      );
    }
    this.client = client;
    this.table = "incidents";
  }

  async create(incident) {
    // Strip geom if present — PostgreSQL trigger computes geom from location
    const { geom, ...dbPayload } = incident;

    const { data, error } = await this.client
      .from(this.table)
      .insert([dbPayload])
      .select()
      .single();

    if (error) {
      throw new Error(`[SupabaseIncidentRepository.create] Failed: ${error.message} (code: ${error.code})`);
    }

    return data;
  }

  async findAll(options = {}) {
    let query = this.client
      .from(this.table)
      .select("*", { count: "exact" });

    if (options.bus_id) query = query.eq("bus_id", options.bus_id);
    if (options.trigger_reason) query = query.eq("trigger_reason", options.trigger_reason);
    if (options.since) query = query.gte("timestamp", options.since);
    if (options.until) query = query.lte("timestamp", options.until);

    query = query.order("timestamp", { ascending: false });

    const limit = Number.isInteger(options.limit) ? options.limit : 50;
    const offset = Number.isInteger(options.offset) ? options.offset : 0;

    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      throw new Error(`[SupabaseIncidentRepository.findAll] Failed: ${error.message} (code: ${error.code})`);
    }

    const result = data || [];
    result.total = count !== null && count !== undefined ? count : result.length;
    result.limit = limit;
    result.offset = offset;
    return result;
  }

  async findById(id) {
    const { data, error } = await this.client
      .from(this.table)
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new Error(`[SupabaseIncidentRepository.findById] Failed: ${error.message} (code: ${error.code})`);
    }

    return data || null;
  }

  async clear() {
    throw new Error(
      "[SupabaseIncidentRepository.clear] clear() is disabled on Supabase repository " +
        "to prevent accidental deletion of database records. Clean up test records by specific ID."
    );
  }
}

// Select repository: In-memory only if explicitly requested via USE_IN_MEMORY_REPO=true
let repositoryInstance;
if (process.env.USE_IN_MEMORY_REPO === "true") {
  repositoryInstance = new InMemoryIncidentRepository();
} else {
  repositoryInstance = new SupabaseIncidentRepository();
}

module.exports = repositoryInstance;
module.exports.SupabaseIncidentRepository = SupabaseIncidentRepository;
module.exports.InMemoryIncidentRepository = InMemoryIncidentRepository;
