/**
 * Vehicle Density Repository
 *
 * Provides persistence for traffic intelligence observations.
 * Production/application runtime strictly requires Supabase/PostGIS.
 * In-memory repository is retained for explicit test usage only.
 *
 * Invariant: location JSONB is stored directly; the PostGIS `geom`
 * column is populated/updated automatically by a database trigger.
 * Repositories must NOT send `geom` in write payloads.
 */

const { supabase, supabaseEnabled } = require("../config/supabaseClient");

class InMemoryVehicleDensityRepository {
  constructor() {
    this.records = [];
  }

  async create(record) {
    this.records.push(record);
    return { ...record };
  }

  async findAll(options = {}) {
    let list = this.records.map((r) => ({ ...r }));

    if (options.segment_id) list = list.filter((r) => r.segment_id === options.segment_id);
    if (options.since) list = list.filter((r) => new Date(r.recorded_at) >= new Date(options.since));
    if (options.until) list = list.filter((r) => new Date(r.recorded_at) <= new Date(options.until));

    list.sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at));

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
    const item = this.records.find((r) => r.id === id);
    return item ? { ...item } : null;
  }

  async clear() {
    this.records = [];
  }
}

class SupabaseVehicleDensityRepository {
  constructor(client = supabase) {
    if (!client) {
      throw new Error(
        "[TransitEye Configuration Error] Supabase is required for application runtime, " +
          "but the Supabase client is not initialized. Check SUPABASE_URL and SUPABASE_SECRET_KEY in .env. " +
          "Silent in-memory fallback is disabled in application mode."
      );
    }
    this.client = client;
    this.table = "vehicle_density";
  }

  async create(record) {
    // Strip geom if present — PostgreSQL trigger computes geom from location
    const { geom, ...dbPayload } = record;

    const { data, error } = await this.client
      .from(this.table)
      .insert([dbPayload])
      .select()
      .single();

    if (error) {
      throw new Error(`[SupabaseVehicleDensityRepository.create] Failed: ${error.message} (code: ${error.code})`);
    }

    return data;
  }

  async findAll(options = {}) {
    let query = this.client
      .from(this.table)
      .select("*", { count: "exact" });

    if (options.segment_id) query = query.eq("segment_id", options.segment_id);
    if (options.since) query = query.gte("recorded_at", options.since);
    if (options.until) query = query.lte("recorded_at", options.until);

    query = query.order("recorded_at", { ascending: false });

    const limit = Number.isInteger(options.limit) ? options.limit : 50;
    const offset = Number.isInteger(options.offset) ? options.offset : 0;

    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      throw new Error(`[SupabaseVehicleDensityRepository.findAll] Failed: ${error.message} (code: ${error.code})`);
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
      throw new Error(`[SupabaseVehicleDensityRepository.findById] Failed: ${error.message} (code: ${error.code})`);
    }

    return data || null;
  }

  async clear() {
    throw new Error(
      "[SupabaseVehicleDensityRepository.clear] clear() is disabled on Supabase repository " +
        "to prevent accidental deletion of database records. Clean up test records by specific ID."
    );
  }
}

// Select repository: In-memory only if explicitly requested via USE_IN_MEMORY_REPO=true
let repositoryInstance;
if (process.env.USE_IN_MEMORY_REPO === "true") {
  repositoryInstance = new InMemoryVehicleDensityRepository();
} else {
  repositoryInstance = new SupabaseVehicleDensityRepository();
}

module.exports = repositoryInstance;
module.exports.SupabaseVehicleDensityRepository = SupabaseVehicleDensityRepository;
module.exports.InMemoryVehicleDensityRepository = InMemoryVehicleDensityRepository;
