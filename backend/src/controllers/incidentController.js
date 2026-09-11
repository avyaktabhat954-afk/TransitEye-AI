const incidentService = require("../services/incidentService");
const { validateIncidentQuery } = require("../middleware/validateQuery");

/**
 * Controller for handling incident / ANPR HTTP requests.
 */

exports.createIncident = async (req, res, next) => {
  try {
    const created = await incidentService.createIncident(req.body);
    return res.status(201).json({
      success: true,
      message: "Incident accepted and recorded",
      data: created,
    });
  } catch (error) {
    next(error);
  }
};

exports.getIncidents = async (req, res, next) => {
  try {
    const { errors, options } = validateIncidentQuery(req.query);
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: errors,
      });
    }

    const incidents = await incidentService.getAllIncidents(options);
    return res.status(200).json({
      success: true,
      count: incidents.length,
      data: incidents,
      pagination: {
        total: incidents.total !== undefined ? incidents.total : incidents.length,
        limit: incidents.limit !== undefined ? incidents.limit : options.limit,
        offset: incidents.offset !== undefined ? incidents.offset : options.offset,
      },
    });
  } catch (error) {
    next(error);
  }
};
